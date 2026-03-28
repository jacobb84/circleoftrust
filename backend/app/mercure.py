import httpx
from jose import jwt
from datetime import datetime, timedelta
from app.config import get_settings

settings = get_settings()


def create_mercure_jwt(topics: list[str], publish: bool = True, subscribe: bool = True) -> str:
    """Create a JWT token for Mercure hub authentication."""
    payload = {
        "mercure": {}
    }
    
    if publish:
        payload["mercure"]["publish"] = topics
    
    if subscribe:
        payload["mercure"]["subscribe"] = topics
    
    payload["exp"] = datetime.utcnow() + timedelta(hours=24)
    
    return jwt.encode(payload, settings.mercure_publisher_jwt_key, algorithm="HS256")


def create_subscriber_token(room_id: str) -> str:
    """Create a subscriber token for a specific room."""
    topics = [f"room/{room_id}"]
    return create_mercure_jwt(topics, publish=False, subscribe=True)


async def publish_message(room_id: str, message_data: dict) -> bool:
    """Publish a message to the Mercure hub."""
    topic = f"room/{room_id}"
    token = create_mercure_jwt([topic], publish=True, subscribe=False)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    data = {
        "topic": topic,
        "data": str(message_data)
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.mercure_url,
                headers=headers,
                data=data
            )
            return response.status_code == 200
    except Exception as e:
        print(f"Failed to publish message: {e}")
        return False


async def publish_room_event(room_id: str, event_type: str, data: dict) -> bool:
    """Publish a room event (join, leave, expiry warning, etc.)."""
    topic = f"room/{room_id}"
    token = create_mercure_jwt([topic], publish=True, subscribe=False)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    import json
    event_data = {
        "type": event_type,
        **data
    }
    
    form_data = {
        "topic": topic,
        "data": json.dumps(event_data)
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.mercure_url,
                headers=headers,
                data=form_data
            )
            return response.status_code == 200
    except Exception as e:
        print(f"Failed to publish event: {e}")
        return False
