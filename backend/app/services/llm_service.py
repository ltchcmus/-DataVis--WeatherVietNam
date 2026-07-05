"""
Gemini API Wrapper

Interface duy nhất để gọi LLM.
"""

import time
import google.generativeai as genai
from google.generativeai.types import GenerationConfig
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

genai.configure(api_key=settings.gemini_api_key)
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

GENERATION_CONFIG = GenerationConfig(
    temperature=0.2,       
    top_p=0.8,
    top_k=40,
    max_output_tokens=4096,
)


class LLMService:
    """
    Wrapper cho Gemini API.

    Interface chuẩn:
        generate(system_prompt, history, user_message) -> str
    """

    def __init__(self):
        self.model_name = settings.gemini_model
        logger.info(f"LLMService initialized | model={self.model_name}")

    def generate(
        self,
        system_prompt: str,
        history: list[dict],
        user_message: str,
    ) -> tuple[str, dict]:
        """
        Gọi Gemini API và trả về raw text response.

        Args:
            system_prompt: Instruction cho AI (role, rules, format)
            history: Lịch sử hội thoại [{role, parts}]
            user_message: Câu hỏi hiện tại của user

        Returns:
            Tuple (raw_text, usage_info)
            - raw_text: text response từ Gemini
            - usage_info: {prompt_tokens, response_tokens, total_tokens, latency_ms}

        Raises:
            RuntimeError: Nếu Gemini API lỗi
        """
        start_time = time.time()

        try:
            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_prompt,
                generation_config=GENERATION_CONFIG,
                safety_settings=SAFETY_SETTINGS,
            )

            chat = model.start_chat(history=history)
         
            response = chat.send_message(user_message)

            latency_ms = int((time.time() - start_time) * 1000)
 
            usage_info = {
                "latency_ms": latency_ms,
                "prompt_tokens": None,
                "response_tokens": None,
                "total_tokens": None,
            }

    
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                usage_info["prompt_tokens"] = getattr(response.usage_metadata, "prompt_token_count", None)
                usage_info["response_tokens"] = getattr(response.usage_metadata, "candidates_token_count", None)
                usage_info["total_tokens"] = getattr(response.usage_metadata, "total_token_count", None)

            raw_text = response.text

            logger.info(
                f"LLM response received | latency={latency_ms}ms "
                f"| tokens={usage_info.get('total_tokens', 'N/A')}"
            )

            return raw_text, usage_info

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            error_msg = str(e)

            if "quota" in error_msg.lower() or "rate" in error_msg.lower():
                logger.error(f"Gemini rate limit hit | latency={latency_ms}ms | error={error_msg}")
                raise RuntimeError(f"RATE_LIMIT: {error_msg}")
            elif "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                logger.error(f"Gemini authentication error | error={error_msg}")
                raise RuntimeError(f"AUTH_ERROR: Invalid API key")
            else:
                logger.error(f"Gemini API error | latency={latency_ms}ms | error={error_msg}")
                raise RuntimeError(f"LLM_ERROR: {error_msg}")


llm_service = LLMService()
