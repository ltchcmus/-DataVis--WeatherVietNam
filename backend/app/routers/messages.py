import json
import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.db.database import get_db
from app.db.models import ChatMessage, Conversation

router = APIRouter(prefix="/conversations", tags=["Conversations"])


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    action: Optional[str] = None
    code: Optional[str] = None
    explanation: Optional[str] = None
    suggestions: Optional[List[str]] = None
    images: Optional[List[str]] = None
    request_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/{conversation_id}/messages", response_model=List[MessageOut])
def get_messages(conversation_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    result = []
    for m in msgs:
        suggestions_list = None
        if m.suggestions:
            try:
                suggestions_list = json.loads(m.suggestions)
            except Exception:
                suggestions_list = [m.suggestions]
                
        images_list = None
        if m.images:
            try:
                images_list = json.loads(m.images)
            except Exception:
                pass

        result.append(MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            action=m.action,
            code=m.code,
            explanation=m.explanation,
            suggestions=suggestions_list,
            images=images_list,
            request_id=m.request_id,
            created_at=m.created_at,
        ))
    return result


def save_message(
    db: Session,
    conversation_id: str,
    role: str,
    content: str,
    action: Optional[str] = None,
    code: Optional[str] = None,
    explanation: Optional[str] = None,
    suggestions: Optional[List[str]] = None,
    request_id: Optional[str] = None,
) -> ChatMessage:
    """Helper để lưu tin nhắn. Dùng nội bộ bởi ai router."""
    suggestions_str = json.dumps(suggestions, ensure_ascii=False) if suggestions else None
    msg = ChatMessage(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role=role,
        content=content,
        action=action,
        code=code,
        explanation=explanation,
        suggestions=suggestions_str,
        request_id=request_id,
    )
    db.add(msg)
    db.commit()
    return msg
