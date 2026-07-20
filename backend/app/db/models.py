from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    title = Column(String, nullable=True)
    execution_logs = relationship("ExecutionLog", back_populates="conversation")
    chat_messages = relationship("ChatMessage", back_populates="conversation", order_by="ChatMessage.created_at")

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


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)          # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    action = Column(String(30), nullable=True)          # answer | generate_code | ...
    code = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    suggestions = Column(Text, nullable=True)           # JSON string
    request_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="chat_messages")
