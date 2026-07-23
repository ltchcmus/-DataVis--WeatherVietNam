"""
routers/ai.py — HTTP Router cho /ai/chat (SSE streaming)

POST /ai/chat → Server-Sent Events stream (text/event-stream)
Mỗi SSE event có dạng: data: <json_chunk>\n\n
Event cuối cùng: data: [DONE]\n\n
"""
import json

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.chat import ChatRequest, ChatResponse, ErrorResponse
from app.services.ai_service import ai_service
from app.services.llm_service import llm_service
from app.services.prompt_builder import PromptBuilder
from app.services.dataset_service import dataset_service
from app.services.response_parser import ResponseParser
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/ai", tags=["AI"])
_prompt_builder = PromptBuilder()
_response_parser = ResponseParser()


@router.post(
    "/chat",
    summary="AI Chat (SSE Streaming)",
    description="""
AI Orchestrator endpoint — trả về Server-Sent Events stream.

**Cách dùng từ frontend:**
```javascript
const es = new EventSource('/ai/chat?...') // Hoặc dùng fetch + ReadableStream
// Mỗi event: { type, chunk } — chunk cuối là full JSON response
```

**KHÔNG execute code.** Code được trả về trong field `code` để user review và approve.
    """,
)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """POST /ai/chat — SSE streaming response."""
    logger.info(f"Incoming chat | conv={request.conversation_id} | hist={len(request.history)}")

    async def event_stream():
        import uuid
        import time

        conversation_id = request.conversation_id or str(uuid.uuid4())
        request_id = str(uuid.uuid4())

        try:
            dataset_metadata = dataset_service.get_metadata(request.dataset_id or "default")

            # Build prompt và load history từ DB
            from app.services.ai_service import _load_history_from_db, _save_messages
            if request.conversation_id:
                db_history = _load_history_from_db(request.conversation_id, db)
                system_prompt, _ = _prompt_builder.build(
                    message=request.message, dataset_metadata=dataset_metadata, history=[]
                )
                gemini_history = db_history if db_history else None
                if gemini_history is None:
                    system_prompt, gemini_history = _prompt_builder.build(
                        message=request.message, dataset_metadata=dataset_metadata, history=request.history
                    )
            else:
                system_prompt, gemini_history = _prompt_builder.build(
                    message=request.message, dataset_metadata=dataset_metadata, history=request.history
                )

            # Kiểm tra giới hạn lịch sử để tránh vượt quá context window
            from app.config import get_settings
            settings = get_settings()
            if len(gemini_history) >= settings.gemini_max_history_turns * 2:
                error_msg = f"Cuộc hội thoại này đã quá dài (vượt quá {settings.gemini_max_history_turns} lượt). Vui lòng tạo cuộc hội thoại mới để tiếp tục."
                yield f"data: {json.dumps({'type': 'error', 'code': 400, 'message': error_msg})}\n\n"
                return

            # Kiểm tra số lượng ảnh
            if request.images and len(request.images) > settings.max_image_uploads:
                error_msg = f"Chỉ được phép tải lên tối đa {settings.max_image_uploads} ảnh cùng lúc."
                yield f"data: {json.dumps({'type': 'error', 'code': 400, 'message': error_msg})}\n\n"
                return

            # Streaming: yield từng chunk
            full_text = ""
            for chunk in llm_service.generate_stream(
                system_prompt=system_prompt,
                history=gemini_history,
                user_message=request.message,
                images=request.images
            ):
                if chunk.startswith("[ERROR]"):
                    yield f"data: {json.dumps({'type': 'error', 'message': chunk})}\n\n"
                    return
                full_text += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

            # Parse full response
            from app.utils.security import validate_code
            chat_response = _response_parser.parse(
                raw_text=full_text,
                conversation_id=conversation_id,
                request_id=request_id,
            )

            if chat_response.code:
                warnings = validate_code(chat_response.code)
                chat_response.warnings.extend(warnings)

            # Lưu vào DB
            _save_messages(db, conversation_id, request.message, chat_response, images=request.images)

            # Gửi final event với toàn bộ response
            yield f"data: {json.dumps({'type': 'done', 'response': chat_response.model_dump()})}\n\n"
            yield "data: [DONE]\n\n"

        except RuntimeError as e:
            err = str(e)
            if "RATE_LIMIT" in err:
                yield f"data: {json.dumps({'type': 'error', 'code': 503, 'message': 'AI service tạm thời không khả dụng. Vui lòng thử lại sau.'})}\n\n"
            else:
                logger.error(f"LLM error in SSE stream: {e}")
                yield f"data: {json.dumps({'type': 'error', 'code': 500, 'message': 'Lỗi AI service. Vui lòng thử lại.'})}\n\n"
        except Exception as e:
            logger.error(f"Unexpected error in /ai/chat SSE: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'code': 500, 'message': 'Lỗi hệ thống.'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/health", summary="AI Health Check")
async def health():
    return {"status": "ok", "service": "ai"}
