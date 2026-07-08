from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    execution_logs = relationship("ExecutionLog", back_populates="conversation")

class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"))
    request_id = Column(String, nullable=False, index=True)
    prompt = Column(Text, nullable=True)
    generated_code = Column(Text, nullable=True)
    approved_code = Column(Text, nullable=True)
    output_type = Column(String, nullable=True)
    result_json = Column(Text, nullable=True)
    chart_base64 = Column(Text, nullable=True)
    execution_stdout = Column(Text, nullable=True)
    execution_stderr = Column(Text, nullable=True)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="execution_logs")
