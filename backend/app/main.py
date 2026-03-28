from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import json

from app.database import engine, Base, get_db
from app.schemas import (
    RoomCreate, RoomResponse, MessageCreate, MessageResponse,
    RoomInfo, MercureToken
)
from app import services
from app.mercure import create_subscriber_token, publish_room_event

scheduler = AsyncIOScheduler()


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
async def send_message(room_id: str, message_data: MessageCreate, db: Session = Depends(get_db)):
    """Send an encrypted message to a room."""
    message = services.add_message(db, room_id, message_data)
    
    if not message:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    
    await publish_room_event(room_id, "message", {
        "id": message.id,
        "encrypted_content": message.encrypted_content,
        "sender_name": message.sender_name,
        "timestamp": message.timestamp.isoformat()
    })
    
    return message


@app.post("/rooms/{room_id}/join")
async def join_room(room_id: str, username: str, db: Session = Depends(get_db)):
    """Join a room and notify other users."""
    room = services.get_room(db, room_id)
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or expired")
    
    await publish_room_event(room_id, "user_joined", {"username": username})
    
    return {"success": True, "room_id": room_id}


@app.post("/rooms/{room_id}/leave")
async def leave_room(room_id: str, username: str, db: Session = Depends(get_db)):
    """Leave a room and notify other users."""
    room = services.get_room(db, room_id)
    
    if room:
        await publish_room_event(room_id, "user_left", {"username": username})
    
    return {"success": True}


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
