from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from collections import defaultdict
import json

from app.database import engine, Base, get_db
from app.schemas import (
    RoomCreate, RoomResponse, MessageCreate, MessageResponse,
    RoomInfo, MercureToken
)
from app import services
from app.mercure import create_subscriber_token, publish_room_event, create_session_token, validate_session_token
from app.config import get_settings

scheduler = AsyncIOScheduler()

room_users: dict[str, set[str]] = defaultdict(set)


def cleanup_expired_rooms():
    """Scheduled task to clean up expired rooms."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        count = services.delete_expired_rooms(db)
        if count > 0:
            print(f"Cleaned up {count} expired rooms")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    
    scheduler.add_job(cleanup_expired_rooms, 'interval', minutes=1)
    scheduler.start()
    
    yield
    
    scheduler.shutdown()


app = FastAPI(
    title="Circle of Trust API",
    description="Anonymous, temporary, E2E encrypted chat rooms",
    version="1.0.0",
    lifespan=lifespan
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Circle of Trust API", "status": "operational"}


@app.post("/rooms", response_model=RoomResponse)
async def create_room(room_data: RoomCreate, db: Session = Depends(get_db)):
    """Create a new encrypted chat room."""
    room = services.create_room(db, room_data)
    return room


@app.get("/rooms/{room_id}", response_model=RoomInfo)
async def get_room(room_id: str, db: Session = Depends(get_db)):
    """Get room information."""
    room_info = services.get_room_info(db, room_id)
    
    if not room_info:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    
    return room_info


@app.get("/rooms/{room_id}/exists")
async def check_room_exists(room_id: str, db: Session = Depends(get_db)):
    """Check if a room exists and is active."""
    room = services.get_room(db, room_id)
    return {"exists": room is not None, "room_id": room_id}


@app.get("/rooms/{room_id}/messages", response_model=list[MessageResponse])
async def get_messages(room_id: str, db: Session = Depends(get_db)):
    """Get all messages for a room."""
    room = services.get_room(db, room_id)
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    
    messages = services.get_room_messages(db, room_id)
    return messages


@app.post("/rooms/{room_id}/messages", response_model=MessageResponse)
async def send_message(
    room_id: str,
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    authorization: str = Header(None)
):
    """Send an encrypted message to a room. Requires valid session token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Session token required")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    verified_username = validate_session_token(token, room_id)
    
    if not verified_username:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    
    message = services.add_message(db, room_id, message_data.encrypted_content, verified_username)
    
    if not message:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    
    await publish_room_event(room_id, "message", {
        "id": message.id,
        "encrypted_content": message.encrypted_content,
        "sender_name": message.sender_name,
        "timestamp": message.timestamp.strftime('%Y-%m-%dT%H:%M:%S') + 'Z'
    })
    
    return message


@app.post("/rooms/{room_id}/join")
async def join_room(room_id: str, username: str, db: Session = Depends(get_db)):
    """Join a room and notify other users. Returns a session token for authentication."""
    room = services.get_room(db, room_id)
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    
    if username in room_users[room_id]:
        raise HTTPException(status_code=409, detail="Username already taken in this room")
    
    is_new_user = True
    room_users[room_id].add(username)
    
    if is_new_user:
        await publish_room_event(room_id, "user_joined", {"username": username})
    
    session_token = create_session_token(room_id, username)
    
    return {
        "success": True,
        "room_id": room_id,
        "users": list(room_users[room_id]),
        "session_token": session_token
    }


@app.post("/rooms/{room_id}/leave")
async def leave_room(room_id: str, username: str, db: Session = Depends(get_db)):
    """Leave a room and notify other users. Deletes room if last user leaves."""
    room = services.get_room(db, room_id)
    
    room_users[room_id].discard(username)
    
    if room:
        await publish_room_event(room_id, "user_left", {"username": username})
    
    if not room_users[room_id]:
        del room_users[room_id]
        if room:
            await publish_room_event(room_id, "room_deleted", {"reason": "all_users_left"})
            services.delete_room(db, room_id)
    
    return {"success": True}


@app.get("/rooms/{room_id}/users")
async def get_room_users(room_id: str, db: Session = Depends(get_db)):
    """Get list of active users in a room."""
    room = services.get_room(db, room_id)
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    
    return {"users": list(room_users[room_id])}


@app.get("/rooms/{room_id}/subscribe-token", response_model=MercureToken)
async def get_subscribe_token(room_id: str, db: Session = Depends(get_db)):
    """Get a Mercure subscription token for a room."""
    room = services.get_room(db, room_id)
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    
    token = create_subscriber_token(room_id)
    return {"token": token}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
