"""
ai_service.py — AI Orchestrator

Flow:
  1. Validate request
  2. Load dataset metadata
  3. Load gemini_history từ DB (nếu conversation_id đã tồn tại)
  4. Build prompt
  5. Call LLM
  6. Parse response
  7. Security check
  8. Lưu messages vào DB
  9. Return ChatResponse
"""
import json
import uuid
import time
from sqlalchemy.orm import Session

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.dataset_service import dataset_service
from app.services.prompt_builder import PromptBuilder
from app.services.llm_service import llm_service
from app.services.response_parser import ResponseParser
from app.utils.security import validate_code
from app.utils.logger import get_logger

logger = get_logger(__name__)
prompt_builder = PromptBuilder()
response_parser = ResponseParser()


def _load_history_from_db(conversation_id: str, db: Session) -> list[dict]:
    """Load lịch sử chat từ DB theo Gemini format [{role, parts}]."""
    try:
        from app.db.models import ChatMessage
        msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at)
            .all()
        )
        history = []
        for m in msgs:
            gemini_role = "user" if m.role == "user" else "model"
            parts = []
            
            # Nếu có ảnh cũ, cần nhét lại vào history dưới dạng inline_data
            if m.images:
                try:
                    import base64
                    images_list = json.loads(m.images)
                    for b64_img in images_list:
                        # Extract mime type
                        mime_type = "image/jpeg"
                        if b64_img.startswith("data:image"):
                            mime_type = b64_img.split(";")[0].split(":")[1]
                            b64_data = b64_img.split(",")[1]
                        else:
                            b64_data = b64_img
                        parts.append({"mime_type": mime_type, "data": base64.b64decode(b64_data)})
                except Exception as e:
                    logger.warning(f"Failed to parse images from DB for message {m.id}: {e}")

            parts.append(m.content)
            history.append({"role": gemini_role, "parts": parts})
        return history
    except Exception as e:
        logger.warning(f"Cannot load history from DB: {e}")
        return []


def _save_messages(
    db: Session,
    conversation_id: str,
    user_message: str,
    response: ChatResponse,
    images: list[str] = None
):
    """Lưu cả tin nhắn user lẫn assistant vào DB."""
    try:
        from app.db.models import Conversation, ChatMessage

        # Upsert conversation
        conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not conv:
            title = user_message[:60] + "..." if len(user_message) > 60 else user_message
            conv = Conversation(id=conversation_id, title=title)
            db.add(conv)
        db.flush()

        # User message
        images_str = json.dumps(images) if images else None
        db.add(ChatMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="user",
            content=user_message,
            images=images_str
        ))

        # Assistant message
        suggestions_str = json.dumps(response.suggestions, ensure_ascii=False) if response.suggestions else None
        db.add(ChatMessage(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="assistant",
            content=response.message,
            action=response.action.value if response.action else None,
            code=response.code,
            explanation=response.explanation,
            suggestions=suggestions_str,
            request_id=response.request_id,
        ))
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to save messages to DB: {e}")
        db.rollback()


class AIService:
    async def process_chat(self, request: ChatRequest, db: Session | None = None) -> ChatResponse:
        conversation_id = request.conversation_id or str(uuid.uuid4())
        request_id = str(uuid.uuid4())
        start_time = time.time()

        logger.info(
            f"Chat request | request_id={request_id} | conv={conversation_id} | "
            f"dataset={request.dataset_id} | msg_len={len(request.message)}"
        )

        dataset_metadata = dataset_service.get_metadata(request.dataset_id or "default")
        if dataset_metadata is None:
            logger.warning(f"Dataset '{request.dataset_id}' not found")

        # Load history: ưu tiên DB (nếu có session), fallback về request.history
        if db and request.conversation_id:
            gemini_history_from_db = _load_history_from_db(request.conversation_id, db)
            if gemini_history_from_db:
                logger.debug(f"Loaded {len(gemini_history_from_db)} history turns from DB")
                # Convert request.history sang gemini format làm fallback
                _, fallback_history = prompt_builder.build(
                    message=request.message,
                    dataset_metadata=dataset_metadata,
                    history=request.history,
                )
                system_prompt, _ = prompt_builder.build(
                    message=request.message,
                    dataset_metadata=dataset_metadata,
                    history=[],
                )
                gemini_history = gemini_history_from_db
            else:
                system_prompt, gemini_history = prompt_builder.build(
                    message=request.message,
                    dataset_metadata=dataset_metadata,
                    history=request.history,
                )
        else:
            system_prompt, gemini_history = prompt_builder.build(
                message=request.message,
                dataset_metadata=dataset_metadata,
                history=request.history,
            )

        try:
            raw_text, usage_info = llm_service.generate(
                system_prompt=system_prompt,
                history=gemini_history,
                user_message=request.message,
                images=request.images
            )
        except RuntimeError as e:
            error_str = str(e)
            if "RATE_LIMIT" in error_str:
                raise RuntimeError("RATE_LIMIT")
            raise RuntimeError(f"LLM_ERROR: {error_str}")

        try:
            chat_response = response_parser.parse(
                raw_text=raw_text,
                conversation_id=conversation_id,
                request_id=request_id,
            )
        except Exception as e:
            logger.error(f"Response parsing failed | request_id={request_id} | error={e}")
            raise ValueError(f"Failed to parse AI response: {e}")

        if chat_response.code:
            security_warnings = validate_code(chat_response.code)
            if security_warnings:
                chat_response.warnings.extend(security_warnings)
                logger.warning(f"Security warnings | request_id={request_id} | count={len(security_warnings)}")

        total_ms = int((time.time() - start_time) * 1000)
        logger.info(
            f"Chat complete | request_id={request_id} | action={chat_response.action} | "
            f"latency={total_ms}ms | llm={usage_info.get('latency_ms')}ms"
        )

        # Lưu messages vào DB
        if db:
            _save_messages(db, conversation_id, request.message, chat_response, images=request.images)

        return chat_response


ai_service = AIService()
