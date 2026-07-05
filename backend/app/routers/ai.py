"""
routers/ai.py — HTTP Router cho /ai/chat
Endpoint POST /ai/chat
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from app.schemas.chat import ChatRequest, ChatResponse, ErrorResponse
from app.services.ai_service import ai_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        422: {"description": "Validation Error"},
        500: {"model": ErrorResponse, "description": "LLM Error"},
        503: {"model": ErrorResponse, "description": "Service Unavailable"},
    },
    summary="AI Chat",
    description="""
    AI Orchestrator endpoint.
    
    Nhận câu hỏi từ user → gọi Gemini → trả về response với status='pending'.
    
    **KHÔNG execute code.** Code được trả về trong field `code` để user review và approve.
    Sau khi approve, frontend gọi `POST /execute` (Thịnh) với code đó.
    
    **Action types:**
    - `answer`: Câu trả lời text thông thường
    - `generate_code`: Sinh Python code phân tích dữ liệu
    - `suggest_analysis`: Gợi ý các hướng phân tích
    - `insight`: Nhận xét về dữ liệu
    - `explain_code`: Giải thích code
    """,
)
async def chat(request: ChatRequest) -> ChatResponse:
    """POST /ai/chat"""
    logger.info(f"Incoming chat | dataset={request.dataset_id} | history_len={len(request.history)}")

    try:
        response = await ai_service.process_chat(request)
        return response

    except ValueError as e:
        # Lỗi validation / parse
        logger.warning(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    except RuntimeError as e:
        error_str = str(e)

        # Rate limit / quota
        if "RATE_LIMIT" in error_str:
            logger.error("Gemini rate limit exceeded")
            raise HTTPException(
                status_code=503,
                detail="AI service temporarily unavailable. Please try again later.",
            )

        # Auth error
        if "AUTH_ERROR" in error_str:
            logger.error("Gemini authentication failed")
            raise HTTPException(
                status_code=500,
                detail="AI service configuration error.",
            )

        # Generic LLM error
        logger.error(f"LLM error: {error_str}")
        raise HTTPException(
            status_code=500,
            detail="AI service encountered an error. Please try again.",
        )

    except Exception as e:
        logger.error(f"Unexpected error in /ai/chat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error.")


@router.get(
    "/health",
    summary="AI Health Check",
    description="Kiểm tra AI service có hoạt động không.",
)
async def health():
    """GET /ai/health — health check cho AI module."""
    return {"status": "ok", "service": "ai"}
