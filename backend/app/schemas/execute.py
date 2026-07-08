from pydantic import BaseModel, Field
from typing import Optional, List

class ExecuteRequest(BaseModel):
    code: str = Field(..., description="Python code sau khi user edit/approve")
    request_id: str = Field(..., description="ID của AI chat request")
    conversation_id: str = Field(..., description="ID của conversation")
    prompt: Optional[str] = Field(None, description="Câu hỏi gốc của user")

class ExecuteResponse(BaseModel):
    execution_id: str
    status: str = Field(..., description="'success' hoặc 'error'")
    output_type: str = Field(..., description="'dataframe', 'chart', 'text', 'error'")
    result: Optional[str] = Field(None, description="JSON string của dataframe/kết quả text")
    chart_base64: Optional[str] = Field(None, description="Base64 của biểu đồ")
    logs: List[str] = Field(default_factory=list, description="STDOUT hoặc STDERR logs")
    error: Optional[str] = Field(None, description="Lỗi traceback nếu có")
