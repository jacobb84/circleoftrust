from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(String(10), primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    password_test = Column(Text, nullable=True)
    
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(String(10), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    encrypted_content = Column(Text, nullable=False)
    sender_name = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    room = relationship("Room", back_populates="messages")
