"""
response_parser.py — Parse và validate JSON response từ Gemini
Parser này xử lý các edge case:
  - JSON trong markdown ```json ... ```
  - JSON bị thiếu field
  - AI trả text thường (không phải JSON)
  - Field "action" không hợp lệ
"""

import json
import re
from app.schemas.chat import ChatResponse, ActionType
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ResponseParser:
    """Parse raw LLM text → ChatResponse."""

    def parse(
        self,
        raw_text: str,
        conversation_id: str,
        request_id: str,
    ) -> ChatResponse:
        """
        Parse raw text từ Gemini thành ChatResponse.

        Args:
            raw_text: Text thô từ LLM
            conversation_id: ID của conversation hiện tại
            request_id: ID của request này

        Returns:
            ChatResponse đã validated

        Raises:
            ValueError: Nếu không thể parse sang định dạng hợp lệ
        """
        logger.debug(f"Parsing LLM response | length={len(raw_text)}")

        json_str = self._extract_json(raw_text)

        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse failed, wrapping as plain answer | error={e}")
            data = {
                "action": "answer",
                "message": raw_text.strip(),
            }

        data = self._normalize(data)

        action_str = data.get("action", "answer")
        try:
            action = ActionType(action_str)
        except ValueError:
            logger.warning(f"Unknown action '{action_str}', defaulting to 'answer'")
            action = ActionType.ANSWER
        return ChatResponse(
            action=action,
            status="pending",
            message=data.get("message", ""),
            code=data.get("code") or None,
            explanation=data.get("explanation") or None,
            suggestions=data.get("suggestions", []),
            warnings=data.get("warnings", []),
            conversation_id=conversation_id,
            request_id=request_id,
        )

    def _extract_json(self, text: str) -> str:
        """
        Trích xuất JSON string từ text.
        Xử lý các trường hợp:
          - Pure JSON
          - JSON trong ```json ... ```
          - JSON trong ``` ... ```
        """
        text = text.strip()

        # Case 1: JSON trong ```json ... ```
        match = re.search(r"```json\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if match:
            logger.debug("Extracted JSON from ```json block")
            return match.group(1).strip()

        # Case 2: JSON trong ``` ... ```
        match = re.search(r"```\s*([\s\S]*?)\s*```", text)
        if match:
            candidate = match.group(1).strip()
            if candidate.startswith("{"):
                logger.debug("Extracted JSON from ``` block")
                return candidate

        # Case 3: Tìm JSON object trong text
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            logger.debug("Extracted JSON object from plain text")
            return match.group(0)

        # Case 4: Toàn bộ text là JSON (hoặc không phải JSON)
        return text

    def _normalize(self, data: dict) -> dict:
        """
        Đảm bảo tất cả required fields đều có.
        Điền default nếu thiếu.
        """
        defaults = {
            "action": "answer",
            "status": "pending",
            "message": "",
            "code": None,
            "explanation": None,
            "suggestions": [],
            "warnings": [],
        }

      
        for key, default_val in defaults.items():
            if key not in data or data[key] is None:
                if key not in ("code", "explanation"): 
                    data[key] = default_val

       
        if not isinstance(data.get("suggestions"), list):
            data["suggestions"] = []
        if not isinstance(data.get("warnings"), list):
            data["warnings"] = []
            
        if data.get("code") and data.get("action") == "answer":
            logger.debug("Action corrected: 'answer' → 'generate_code' (code field present)")
            data["action"] = "generate_code"

        return data
