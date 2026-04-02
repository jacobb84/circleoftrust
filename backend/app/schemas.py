from pydantic import BaseModel, Field, field_serializer
from datetime import datetime, timezone
from typing import Optional, List


class RoomCreate(BaseModel):
    duration_minutes: int = Field(..., ge=10, le=60, description="Room duration in minutes (10-60)")
    password_test: str = Field(..., description="Encrypted 'OKAY' string for password validation")


class RoomResponse(BaseModel):
    id: str
    created_at: datetime
    expires_at: datetime
    password_test: str

    class Config:
        from_attributes = True

    @field_serializer('created_at', 'expires_at')
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.strftime('%Y-%m-%dT%H:%M:%S') + 'Z'


class MessageCreate(BaseModel):
    encrypted_content: str


class MessageResponse(BaseModel):
    id: int
    room_id: str
    encrypted_content: str
    sender_name: str
    timestamp: datetime

    class Config:
        from_attributes = True

    @field_serializer('timestamp')
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.strftime('%Y-%m-%dT%H:%M:%S') + 'Z'


class RoomJoin(BaseModel):
    username: str = Field(..., min_length=1, max_length=50)


class RoomInfo(BaseModel):
    id: str
    expires_at: datetime
    message_count: int
    password_test: str

    @field_serializer('expires_at')
    def serialize_datetime(self, dt: datetime) -> str:
        return dt.strftime('%Y-%m-%dT%H:%M:%S') + 'Z'


class MercureToken(BaseModel):
    token: str
