from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import json
import asyncio
from typing import List, Dict
from datetime import datetime
import uuid

app = FastAPI(title="Chat Server", version="1.0.0")

# Mount static files and templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Connection manager for WebSocket connections
class ConnectionManager:
    def __init__(self):
        # Dictionary to store active connections by room
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Dictionary to store user info by connection
        self.connection_info: Dict[WebSocket, Dict] = {}
    
    async def connect(self, websocket: WebSocket, room: str, username: str):
        if room not in self.active_connections:
            self.active_connections[room] = []
        
        self.active_connections[room].append(websocket)
        self.connection_info[websocket] = {
            "username": username,
            "room": room,
            "user_id": str(uuid.uuid4())[:8],
            "joined_at": datetime.now()
        }
        
        print(f"User {username} added to room {room}. Total users: {len(self.active_connections[room])}")
        
        # Notify others in the room about new user
        await self.broadcast_to_room(room, {
            "type": "user_joined",
            "username": username,
            "message": f"{username} joined the chat",
            "timestamp": datetime.now().isoformat()
        }, exclude=websocket)
        
        # Send current room info to the new user
        await self.send_room_info(websocket, room)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.connection_info:
            user_info = self.connection_info[websocket]
            room = user_info["room"]
            username = user_info["username"]
            
            # Remove from active connections
            if room in self.active_connections:
                if websocket in self.active_connections[room]:
                    self.active_connections[room].remove(websocket)
                if not self.active_connections[room]:
                    del self.active_connections[room]
            
            # Remove connection info
            del self.connection_info[websocket]
            
            # Notify others in the room
            asyncio.create_task(self.broadcast_to_room(room, {
                "type": "user_left",
                "username": username,
                "message": f"{username} left the chat",
                "timestamp": datetime.now().isoformat()
            }))
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast_to_room(self, room: str, message: dict, exclude: WebSocket = None):
        if room in self.active_connections:
            print(f"Broadcasting to {len(self.active_connections[room])} users in room {room}")
            connections_to_remove = []
            
            for connection in self.active_connections[room]:
                if exclude and connection == exclude:
                    continue
                try:
                    await connection.send_text(json.dumps(message))
                    print(f"Message sent to user in room {room}")
                except Exception as e:
                    print(f"Error sending message to user in room {room}: {e}")
                    # Mark for removal
                    connections_to_remove.append(connection)
            
            # Remove disconnected connections
            for connection in connections_to_remove:
                self.disconnect(connection)
        else:
            print(f"Room {room} not found in active connections")
    
    async def send_room_info(self, websocket: WebSocket, room: str):
        # Send list of current users in the room
        users = []
        if room in self.active_connections:
            for connection in self.active_connections[room]:
                if connection in self.connection_info:
                    users.append({
                        "username": self.connection_info[connection]["username"],
                        "user_id": self.connection_info[connection]["user_id"],
                        "joined_at": self.connection_info[connection]["joined_at"].isoformat()
                    })
        
        await websocket.send_text(json.dumps({
            "type": "room_info",
            "users": users,
            "room": room
        }))

manager = ConnectionManager()

@app.get("/", response_class=HTMLResponse)
async def get_chat_page(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})

@app.websocket("/ws/{room}")
async def websocket_endpoint(websocket: WebSocket, room: str):
    try:
        await websocket.accept()
        print(f"WebSocket connection accepted for room: {room}")
        
        # Wait for username
        data = await websocket.receive_text()
        message_data = json.loads(data)
        username = message_data.get("username", "Anonymous")
        
        if not username.strip():
            username = "Anonymous"
        
        print(f"User {username} connecting to room {room}")
        await manager.connect(websocket, room, username)
        
        try:
            while True:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                print(f"Received message: {message_data}")
                
                if message_data.get("type") == "chat_message":
                    if websocket in manager.connection_info:
                        user_info = manager.connection_info[websocket]
                        message = {
                            "type": "chat_message",
                            "username": user_info["username"],
                            "user_id": user_info["user_id"],
                            "message": message_data.get("message", ""),
                            "timestamp": datetime.now().isoformat()
                        }
                        print(f"Broadcasting message from {user_info['username']}: {message_data.get('message')}")
                        await manager.broadcast_to_room(room, message)
                    else:
                        print("WebSocket not found in connection info")
                
        except WebSocketDisconnect:
            print(f"WebSocket disconnected for room {room}")
            manager.disconnect(websocket)
        except Exception as e:
            print(f"Error in WebSocket loop: {e}")
            manager.disconnect(websocket)
            
    except Exception as e:
        print(f"WebSocket connection error: {e}")
        try:
            manager.disconnect(websocket)
        except:
            pass

@app.get("/health")
async def health_check():
    return {"status": "healthy", "active_rooms": len(manager.active_connections)}

@app.get("/rooms")
async def get_rooms():
    return {"rooms": list(manager.active_connections.keys())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
