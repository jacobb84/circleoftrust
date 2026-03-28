# Circle of Trust

An anonymous, temporary, end-to-end encrypted chat room system.

![Circle of Trust](frontend/public/favicon.svg)

## Features

- **End-to-End Encryption**: All messages are encrypted client-side using AES-256-GCM with PBKDF2 key derivation
- **Temporary Rooms**: Rooms automatically expire between 10 minutes to 1 hour
- **Anonymous**: No user accounts, no tracking, no logs kept after expiration
- **Real-time**: Powered by Mercure for instant message delivery
- **Shareable Links**: Easy room sharing with 10-character random IDs

## Tech Stack

- **Backend**: Python/FastAPI with SQLite
- **Frontend**: React/Vite with TailwindCSS
- **Real-time**: Mercure Hub
- **Encryption**: Web Crypto API (AES-256-GCM)

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Running with Docker

1. Clone the repository

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Start all services:
   ```bash
   docker-compose up --build
   ```

4. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - Mercure Hub: http://localhost:3000

## Usage

### Creating a Room

1. Go to http://localhost:5173
2. Enter your username
3. Set a strong password (this is the encryption key!)
4. Choose room duration (10-60 minutes)
5. Click "Create Secure Room"

### Joining a Room

1. Share the room link with participants
2. They enter their username and the room password
3. Start chatting securely!

### Security Notes

- **The password IS the encryption key** - share it securely (not in the room link!)
- All encryption/decryption happens in the browser
- Server only stores encrypted messages
- Everything is deleted when the room expires

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│   SQLite    │
│  (React)    │     │  (FastAPI)  │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                   Mercure Hub                        │
│              (Real-time messaging)                   │
└─────────────────────────────────────────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/rooms` | Create a new room |
| GET | `/rooms/{id}` | Get room info |
| GET | `/rooms/{id}/exists` | Check if room exists |
| GET | `/rooms/{id}/messages` | Get all messages |
| POST | `/rooms/{id}/messages` | Send a message |
| POST | `/rooms/{id}/join` | Join a room |
| POST | `/rooms/{id}/leave` | Leave a room |
| GET | `/rooms/{id}/subscribe-token` | Get Mercure token |

## Development

### Backend (without Docker)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (without Docker)

```bash
cd frontend
npm install
npm run dev
```

## Security

- Messages are encrypted using AES-256-GCM
- Keys are derived using PBKDF2 with 100,000 iterations
- Each message has a unique salt and IV
- Server never sees plaintext messages
- Room data is completely purged on expiration

## License

MIT License
