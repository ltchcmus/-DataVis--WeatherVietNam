from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ExecutionLogResponse(BaseModel):
    id: str
    conversation_id: str
    request_id: str
    prompt: Optional[str]
    generated_code: Optional[str]
    approved_code: Optional[str]
    output_type: Optional[str]
    executed_at: datetime

    class Config:
        from_attributes = True

class LogsResponse(BaseModel):
    total: int
    logs: List[ExecutionLogResponse]

class ConversationResponse(BaseModel):
    id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
