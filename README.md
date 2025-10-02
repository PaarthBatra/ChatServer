# Chat Server

A modern, real-time chat server built with Python FastAPI and WebSockets. Features a beautiful web interface with room support, user management, and responsive design.

## Features

- 🚀 **Real-time messaging** using WebSockets
- 🏠 **Room support** - create and join different chat rooms
- 👥 **User management** - see who's online in each room
- 💾 **Persistent settings** - username and room preferences saved locally
- 📱 **Responsive design** - works on desktop, tablet, and mobile
- 🎨 **Modern UI** - beautiful gradient design with smooth animations
- 🔄 **Auto-reconnection** - automatically reconnects if connection is lost
- ⚡ **Fast and lightweight** - built with FastAPI for high performance

## Installation

1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

### Development Mode
```bash
python main.py
```

The server will start on `http://localhost:8000`

### Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Usage

1. **Open your browser** and go to `http://localhost:8000`
2. **Enter your username** and click "Set Username"
3. **Join a room** by typing a room name (default is "general")
4. **Start chatting!**

### Room Management
- **Join Room**: Enter a room name and click "Join Room"
- **Leave Room**: Click "Leave Room" to disconnect
- **Multiple Rooms**: Different rooms are completely separate

### Features
- **Real-time messaging**: Messages appear instantly for all users
- **User list**: See who's currently online in your room
- **Message history**: View all messages in the current session
- **Auto-reconnection**: If you lose connection, it will automatically reconnect
- **Responsive design**: Works great on all device sizes

## API Endpoints

- `GET /` - Main chat interface
- `GET /health` - Health check endpoint
- `GET /rooms` - List active rooms
- `WebSocket /ws/{room}` - WebSocket connection for real-time chat

## WebSocket Message Format

### Client to Server
```json
{
  "username": "string",
  "type": "chat_message",
  "message": "string"
}
```

### Server to Client
```json
{
  "type": "chat_message|user_joined|user_left|room_info",
  "username": "string",
  "message": "string",
  "timestamp": "ISO string",
  "users": [{"username": "string", "user_id": "string"}]
}
```

## Deployment

### Local Network
To make the server accessible on your local network:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Then access via `http://YOUR_IP:8000` from other devices.

### Cloud Deployment
The server can be deployed to any cloud platform that supports Python:

1. **Heroku**: Add a `Procfile` with `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
2. **Railway**: Deploy directly from GitHub
3. **DigitalOcean App Platform**: Deploy with automatic HTTPS
4. **AWS/GCP/Azure**: Use container services or virtual machines

### Docker Deployment
Create a `Dockerfile`:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Configuration

The server runs on port 8000 by default. You can change this by modifying the `uvicorn.run()` call in `main.py` or by using command-line arguments:

```bash
uvicorn main:app --port 8080
```

## Security Notes

- The server accepts connections from any host (0.0.0.0)
- No authentication is implemented (usernames are not verified)
- For production use, consider adding:
  - User authentication
  - Rate limiting
  - Input validation and sanitization
  - HTTPS/WSS encryption
  - Message persistence to database

## Browser Compatibility

- Chrome 16+
- Firefox 11+
- Safari 7+
- Edge 12+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

This project is open source and available under the MIT License.
