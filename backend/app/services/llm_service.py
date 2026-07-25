"""
LLM Service — Gemini wrapper với:
  - Multi-key round-robin (GEMINI_API_KEYS=k1,k2,k3)
  - Retry + Exponential Backoff với jitter
  - SSE streaming support
  - Graceful fallback: nếu tất cả key hết quota → raise AllKeysExhausted
"""
import itertools
import random
import time
from typing import Generator

import google.generativeai as genai
from google.generativeai.types import GenerationConfig

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

GENERATION_CONFIG = GenerationConfig(
    temperature=0.2,
    top_p=0.8,
    top_k=40,
    max_output_tokens=4096,
    response_mime_type="application/json",
)

SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]


def _is_quota_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "429" in msg or "quota" in msg or "resource_exhausted" in msg


def _is_auth_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "api_key" in msg or "authentication" in msg or "invalid" in msg


def _backoff_wait(attempt: int) -> float:
    base = settings.gemini_base_backoff_seconds
    cap = settings.gemini_max_backoff_seconds
    wait = min(base * (2 ** attempt), cap)
    return wait + random.uniform(0, min(1.0, wait * 0.1))


class LLMService:
    """Gemini API wrapper với round-robin multi-key và retry/backoff."""

    def __init__(self):
        self._keys = settings.get_gemini_keys()
        if not self._keys:
            logger.warning("No Gemini API keys configured!")
        else:
            logger.info(f"LLMService initialized | keys={len(self._keys)} | model={settings.gemini_model}")
        self._key_cycle = itertools.cycle(self._keys) if self._keys else iter([])

    def _get_model(self, key: str) -> genai.GenerativeModel:
        genai.configure(api_key=key)
        return genai.GenerativeModel(
            model_name=settings.gemini_model,
            generation_config=GENERATION_CONFIG,
            safety_settings=SAFETY_SETTINGS,
        )

    def generate(
        self,
        system_prompt: str,
        history: list[dict],
        user_message: str,
        images: list[str] = None
    ) -> tuple[str, dict]:
        """
        Gọi Gemini (non-streaming). Round-robin keys, retry on transient errors.
        Returns (raw_text, usage_info).
        Raises RuntimeError on all keys exhausted or non-recoverable error.
        """
        if not self._keys:
            raise RuntimeError("AUTH_ERROR: No Gemini API keys configured")

        max_retries = settings.gemini_max_retries
        exhausted_keys: set[str] = set()
        attempt = 0

        # Construct message parts
        message_parts = []
        if images:
            import base64
            for b64_img in images:
                try:
                    mime_type = "image/jpeg"
                    if b64_img.startswith("data:image"):
                        mime_type = b64_img.split(";")[0].split(":")[1]
                        b64_data = b64_img.split(",")[1]
                    else:
                        b64_data = b64_img
                    message_parts.append({"mime_type": mime_type, "data": base64.b64decode(b64_data)})
                except Exception as e:
                    logger.warning(f"Failed to parse image for Gemini API: {e}")
        message_parts.append(user_message)

        while True:
            key = next(self._key_cycle)

            # Nếu tất cả keys đã bị quota
            if len(exhausted_keys) >= len(self._keys):
                raise RuntimeError("RATE_LIMIT: All Gemini API keys quota exceeded")

            start = time.time()
            try:
                # Inject system prompt vào user message (Gemini hỗ trợ system_instruction)
                model_with_system = genai.GenerativeModel(
                    model_name=settings.gemini_model,
                    system_instruction=system_prompt,
                    generation_config=GENERATION_CONFIG,
                    safety_settings=SAFETY_SETTINGS,
                )
                genai.configure(api_key=key)
                chat = model_with_system.start_chat(history=history)
                response = chat.send_message(message_parts)

                latency_ms = int((time.time() - start) * 1000)
                usage = {
                    "latency_ms": latency_ms,
                    "prompt_tokens": None,
                    "response_tokens": None,
                    "total_tokens": None,
                }
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    usage["prompt_tokens"] = getattr(response.usage_metadata, "prompt_token_count", None)
                    usage["response_tokens"] = getattr(response.usage_metadata, "candidates_token_count", None)
                    usage["total_tokens"] = getattr(response.usage_metadata, "total_token_count", None)

                logger.info(f"Gemini OK | latency={latency_ms}ms | tokens={usage['total_tokens']}")
                return response.text, usage

            except Exception as e:
                latency_ms = int((time.time() - start) * 1000)

                if _is_quota_error(e):
                    exhausted_keys.add(key)
                    logger.warning(f"Gemini quota exceeded | key=...{key[-6:]} | exhausted={len(exhausted_keys)}/{len(self._keys)}")
                    continue  # Thử key tiếp theo ngay

                if _is_auth_error(e):
                    raise RuntimeError(f"AUTH_ERROR: Invalid Gemini API key (...{key[-6:]})")

                # Transient error — retry với backoff
                if attempt < max_retries - 1:
                    wait = _backoff_wait(attempt)
                    logger.warning(f"Gemini transient error (attempt {attempt+1}/{max_retries}), retry in {wait:.1f}s: {e}")
                    time.sleep(wait)
                    attempt += 1
                    continue

                raise RuntimeError(f"LLM_ERROR: {e}")

    def generate_stream(
        self,
        system_prompt: str,
        history: list[dict],
        user_message: str,
        images: list[str] = None
    ) -> Generator[str, None, None]:
        """
        Streaming generator — yield từng chunk text.
        Dùng cho SSE endpoint.
        """
        if not self._keys:
            yield "[ERROR] No Gemini API keys configured"
            return

        exhausted_keys: set[str] = set()

        # Construct message parts
        message_parts = []
        if images:
            import base64
            for b64_img in images:
                try:
                    mime_type = "image/jpeg"
                    if b64_img.startswith("data:image"):
                        mime_type = b64_img.split(";")[0].split(":")[1]
                        b64_data = b64_img.split(",")[1]
                    else:
                        b64_data = b64_img
                    message_parts.append({"mime_type": mime_type, "data": base64.b64decode(b64_data)})
                except Exception as e:
                    logger.warning(f"Failed to parse image for Gemini API (stream): {e}")
        message_parts.append(user_message)

        while True:
            key = next(self._key_cycle)
            if len(exhausted_keys) >= len(self._keys):
                yield "[ERROR] All Gemini API keys quota exceeded"
                return

            try:
                model = genai.GenerativeModel(
                    model_name=settings.gemini_model,
                    system_instruction=system_prompt,
                    generation_config=GENERATION_CONFIG,
                    safety_settings=SAFETY_SETTINGS,
                )
                genai.configure(api_key=key)
                chat = model.start_chat(history=history)
                response = chat.send_message(message_parts, stream=True)

                for chunk in response:
                    try:
                        if chunk.text:
                            yield chunk.text
                    except ValueError as e:
                        if "response.text" in str(e):
                            yield "\n\n[LỖI] AI từ chối trả lời do nội dung vi phạm chính sách an toàn (Safety Filters)."
                            return
                        else:
                            raise e
                return

            except Exception as e:
                if _is_quota_error(e):
                    exhausted_keys.add(key)
                    continue
                yield f"[ERROR] {e}"
                return


llm_service = LLMService()
