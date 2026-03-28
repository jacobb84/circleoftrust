import secrets
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models import Room, Message
from app.schemas import RoomCreate, MessageCreate


def generate_room_id(length: int = 10) -> str:
    """Generate a random room ID with alphanumeric characters."""
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def create_room(db: Session, room_data: RoomCreate) -> Room:
    """Create a new chat room with expiration time."""
    room_id = generate_room_id()
    
    while db.query(Room).filter(Room.id == room_id).first():
        room_id = generate_room_id()
    
    expires_at = datetime.utcnow() + timedelta(minutes=room_data.duration_minutes)
    
    room = Room(
        id=room_id,
        expires_at=expires_at
    )
    
    db.add(room)
    db.commit()
    db.refresh(room)
    
    return room


def get_room(db: Session, room_id: str) -> Room | None:
    """Get a room by ID if it exists and hasn't expired."""
    room = db.query(Room).filter(Room.id == room_id).first()
    
    if room and room.expires_at > datetime.utcnow():
        return room
    
    return None


def room_exists(db: Session, room_id: str) -> bool:
    """Check if a room exists (regardless of expiration)."""
    return db.query(Room).filter(Room.id == room_id).first() is not None


def add_message(db: Session, room_id: str, message_data: MessageCreate) -> Message | None:
    """Add an encrypted message to a room."""
    room = get_room(db, room_id)
    
    if not room:
        return None
    
    message = Message(
        room_id=room_id,
        encrypted_content=message_data.encrypted_content,
        sender_name=message_data.sender_name
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return message


def get_room_messages(db: Session, room_id: str) -> list[Message]:
    """Get all messages for a room."""
    return db.query(Message).filter(Message.room_id == room_id).order_by(Message.timestamp.asc()).all()


def delete_expired_rooms(db: Session) -> int:
    """Delete all expired rooms and their messages."""
    expired_rooms = db.query(Room).filter(Room.expires_at <= datetime.utcnow()).all()
    count = len(expired_rooms)
    
    for room in expired_rooms:
        db.delete(room)
    
    db.commit()
    return count


def get_room_info(db: Session, room_id: str) -> dict | None:
    """Get room information including message count."""
    room = get_room(db, room_id)
    
    if not room:
        return None
    
    message_count = db.query(Message).filter(Message.room_id == room_id).count()
    
    return {
        "id": room.id,
        "expires_at": room.expires_at,
        "message_count": message_count
    }
