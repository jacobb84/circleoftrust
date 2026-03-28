from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class RoomCreate(BaseModel):
    duration_minutes: int = Field(..., ge=10, le=60, description="Room duration in minutes (10-60)")


class RoomResponse(BaseModel):
    id: str
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    encrypted_content: str
    sender_name: str = Field(..., min_length=1, max_length=50)


class MessageResponse(BaseModel):
    id: int
    room_id: str
    encrypted_content: str
    sender_name: str
    timestamp: datetime

    class Config:
        from_attributes = True


class RoomJoin(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)


class RoomInfo(BaseModel):
    id: str
    expires_at: datetime
    message_count: int


class MercureToken(BaseModel):
    token: str
