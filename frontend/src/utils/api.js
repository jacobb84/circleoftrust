const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MERCURE_URL = import.meta.env.VITE_MERCURE_URL || 'http://localhost:3000/.well-known/mercure';

export async function createRoom(durationMinutes) {
  const response = await fetch(`${API_URL}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ duration_minutes: durationMinutes })
  });
  
  if (!response.ok) {
    throw new Error('Failed to create room');
  }
  
  return response.json();
}

export async function checkRoomExists(roomId) {
  const response = await fetch(`${API_URL}/rooms/${roomId}/exists`);
  return response.json();
}

export async function getRoomInfo(roomId) {
  const response = await fetch(`${API_URL}/rooms/${roomId}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('Failed to get room info');
  }
  
  return response.json();
}

export async function getMessages(roomId) {
  const response = await fetch(`${API_URL}/rooms/${roomId}/messages`);
  
  if (!response.ok) {
    throw new Error('Failed to get messages');
  }
  
  return response.json();
}

export async function sendMessage(roomId, encryptedContent, senderName) {
  const response = await fetch(`${API_URL}/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      encrypted_content: encryptedContent,
      sender_name: senderName
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to send message');
  }
  
  return response.json();
}

export async function joinRoom(roomId, username) {
  const response = await fetch(`${API_URL}/rooms/${roomId}/join?username=${encodeURIComponent(username)}`, {
    method: 'POST'
  });
  
  if (!response.ok) {
    throw new Error('Failed to join room');
  }
  
  return response.json();
}

export async function leaveRoom(roomId, username) {
  await fetch(`${API_URL}/rooms/${roomId}/leave?username=${encodeURIComponent(username)}`, {
    method: 'POST'
  });
}

export async function getSubscribeToken(roomId) {
  const response = await fetch(`${API_URL}/rooms/${roomId}/subscribe-token`);
  
  if (!response.ok) {
    throw new Error('Failed to get subscribe token');
  }
  
  return response.json();
}

export function subscribeToRoom(roomId, token, onMessage) {
  const url = new URL(MERCURE_URL);
  url.searchParams.append('topic', `room/${roomId}`);
  
  const eventSource = new EventSource(url, {
    withCredentials: false
  });
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('EventSource error:', error);
  };
  
  return eventSource;
}
