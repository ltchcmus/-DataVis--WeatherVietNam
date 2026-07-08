from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import Conversation
from app.schemas.history import ConversationResponse

router = APIRouter(prefix="/history", tags=["History"])

@router.get("", response_model=List[ConversationResponse])
def get_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    conversations = db.query(Conversation).order_by(Conversation.updated_at.desc()).offset(offset).limit(limit).all()
    return conversations
