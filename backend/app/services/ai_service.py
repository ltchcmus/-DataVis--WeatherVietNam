"""
ai_service.py — AI Orchestrator (Main Service)
Điều phối toàn bộ flow:
  1. Validate request
  2. Load dataset metadata
  3. Build prompt
  4. Call LLM
  5. Parse response
  6. Security check
  7. Return ChatResponse
"""

import uuid
import time
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


class AIService:
    """
    AI Orchestrator.

    Flow:
      ChatRequest
        → load metadata
        → build prompt
        → call LLM
        → parse response
        → security check on code
        → ChatResponse (status=pending)
    """

    async def process_chat(self, request: ChatRequest) -> ChatResponse:
        """
        Xử lý một chat request.

        Args:
            request: ChatRequest từ frontend

        Returns:
            ChatResponse với status='pending'

        Raises:
            ValueError: Input validation failed
            RuntimeError: LLM error
        """

        conversation_id = request.conversation_id or str(uuid.uuid4())
        request_id = str(uuid.uuid4())
        start_time = time.time()

        logger.info(
            f"Chat request | request_id={request_id} "
            f"| conversation_id={conversation_id} "
            f"| dataset={request.dataset_id} "
            f"| message_len={len(request.message)}"
        )

        
        dataset_metadata = dataset_service.get_metadata(request.dataset_id or "default")

        if dataset_metadata is None:
            logger.warning(f"Dataset '{request.dataset_id}' not found, proceeding without context")

        
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
                logger.warning(
                    f"Security warnings for request_id={request_id} "
                    f"| count={len(security_warnings)}"
                )

        # ── Log summary ───────────────────────────────────────
        total_ms = int((time.time() - start_time) * 1000)
        logger.info(
            f"Chat complete | request_id={request_id} "
            f"| action={chat_response.action} "
            f"| total_latency={total_ms}ms "
            f"| llm_latency={usage_info.get('latency_ms')}ms "
            f"| has_code={'yes' if chat_response.code else 'no'} "
            f"| warnings={len(chat_response.warnings)}"
        )

        return chat_response


ai_service = AIService()
