from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ExecutionLog
from app.schemas.history import LogsResponse

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("", response_model=LogsResponse)
def get_logs(
    conversation_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(ExecutionLog).filter(ExecutionLog.conversation_id == conversation_id)
    total = query.count()
    logs = query.order_by(ExecutionLog.executed_at.desc()).offset(offset).limit(limit).all()
    
    return LogsResponse(
        total=total,
        logs=logs
    )
