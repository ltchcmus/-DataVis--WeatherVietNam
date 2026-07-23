"""
Request & Response DTOs: /ai/chat

NOTE:
- ChatRequest: FE gửi lên
- ChatResponse: BE trả về — Thịnh đọc để biết format khi call /ai/chat
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum


class HistoryMessage(BaseModel):
    """Một tin nhắn trong lịch sử hội thoại."""
    role: Literal["user", "assistant"]
    content: str
    images: list[str] = Field(default_factory=list, description="Danh sách base64 images (nếu có)")


class ChatRequest(BaseModel):
    """
    Request body cho POST /ai/chat.

    FE gửi:
    - message: câu hỏi của user
    - conversation_id: None nếu là conversation mới
    - dataset_id: định danh dataset đang dùng
    - history: danh sách tin nhắn trước đó
    - images: danh sách base64 images (tối đa theo env)
    """
    message: str = Field(..., min_length=1, max_length=4000, description="Câu hỏi của user")
    conversation_id: Optional[str] = Field(None, description="ID conversation, None nếu mới")
    dataset_id: Optional[str] = Field("default", description="ID của dataset đang phân tích")
    history: list[HistoryMessage] = Field(default_factory=list, description="Lịch sử hội thoại")
    images: list[str] = Field(default_factory=list, description="Danh sách base64 images")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "So sánh AQI Hà Nội và TP.HCM năm 2023",
                "conversation_id": None,
                "dataset_id": "default",
                "history": []
            }
        }


class ActionType(str, Enum):
    """
    Loại hành động mà AI quyết định.
    Frontend dùng field này để biết render gì.
    """
    ANSWER = "answer"                   # Trả lời text thông thường
    GENERATE_CODE = "generate_code"     # Sinh Python code để phân tích
    SUGGEST_ANALYSIS = "suggest_analysis"  # Gợi ý các hướng phân tích
    INSIGHT = "insight"                 # Nhận xét, phát hiện từ metadata
    EXPLAIN_CODE = "explain_code"       # Giải thích đoạn code


class ChatResponse(BaseModel):
    """
    Response body của POST /ai/chat.

    THỊNH ĐỌC PHẦN NÀY:
    - action: loại response — frontend render khác nhau tùy action
    - status: luôn là "pending" — user phải approve trước khi execute
    - code: Python code string — đây là input cho POST /execute của Thịnh
    - request_id: dùng để link với execution_log trong DB của Thịnh
    - conversation_id: dùng để query /history
    """
    action: ActionType = Field(..., description="Loại hành động AI quyết định")
    status: Literal["pending"] = Field("pending", description="Luôn pending — user phải approve")
    message: str = Field(..., description="Câu trả lời / mô tả bằng ngôn ngữ tự nhiên")
    code: Optional[str] = Field(None, description="Python code (chỉ có khi action=generate_code)")
    explanation: Optional[str] = Field(None, description="Giải thích từng bước của code")
    suggestions: list[str] = Field(default_factory=list, description="Danh sách gợi ý (khi action=suggest_analysis)")
    warnings: list[str] = Field(default_factory=list, description="Cảnh báo nếu code có pattern nguy hiểm")
    conversation_id: str = Field(..., description="ID conversation (tạo mới nếu chưa có)")
    request_id: str = Field(..., description="ID unique cho request này — Thịnh dùng để link execution log")

    class Config:
        json_schema_extra = {
            "example": {
                "action": "generate_code",
                "status": "pending",
                "message": "Tôi đã sinh code để so sánh AQI giữa Hà Nội và TP.HCM.",
                "code": "import pandas as pd\n...",
                "explanation": "Code filter dữ liệu theo tỉnh...",
                "suggestions": [],
                "warnings": [],
                "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
                "request_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
            }
        }


class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str
    error_code: Optional[str] = None
