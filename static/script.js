class ChatClient {
    constructor() {
        this.ws = null;
        this.username = null;
        this.currentRoom = 'general';
        this.isConnected = false;
        
        this.initializeElements();
        this.bindEvents();
        this.updateTime();
        
        // Load saved username if exists
        const savedUsername = localStorage.getItem('chatUsername');
        if (savedUsername) {
            document.getElementById('username-input').value = savedUsername;
        }
        
        // Load saved room if exists
        const savedRoom = localStorage.getItem('chatRoom');
        if (savedRoom) {
            this.currentRoom = savedRoom;
            document.getElementById('room-input').value = savedRoom;
        }
    }
    
    initializeElements() {
        this.elements = {
            usernameInput: document.getElementById('username-input'),
            setUsernameBtn: document.getElementById('set-username-btn'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            messages: document.getElementById('messages'),
            messageSection: document.getElementById('message-section'),
            roomInput: document.getElementById('room-input'),
            joinRoomBtn: document.getElementById('join-room-btn'),
            leaveRoomBtn: document.getElementById('leave-room-btn'),
            connectionStatus: document.getElementById('connection-status'),
            roomName: document.getElementById('room-name'),
            userCount: document.getElementById('user-count'),
            usersList: document.getElementById('users-list'),
            currentTime: document.getElementById('current-time')
        };
    }
    
    bindEvents() {
        this.elements.setUsernameBtn.addEventListener('click', () => this.setUsername());
        this.elements.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.setUsername();
        });
        
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        
        this.elements.joinRoomBtn.addEventListener('click', () => this.joinRoom());
        this.elements.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
        this.elements.roomInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.disconnect();
            } else if (this.username) {
                this.connect();
            }
        });
    }
    
    setUsername() {
        const username = this.elements.usernameInput.value.trim();
        if (!username) {
            alert('Please enter a username');
            return;
        }
        
        this.username = username;
        localStorage.setItem('chatUsername', username);
        
        // Show message input section
        this.elements.messageSection.style.display = 'flex';
        this.elements.setUsernameBtn.textContent = 'Change';
        
        // Hide username input section
        this.elements.usernameInput.style.display = 'none';
        this.elements.setUsernameBtn.style.display = 'none';
        
        this.connect();
    }
    
    connect() {
        if (this.isConnected) return;
        
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.currentRoom}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected successfully');
            this.isConnected = true;
            this.updateConnectionStatus('Connected', 'connected');
            
            // Send username to server
            console.log('Sending username:', this.username);
            this.ws.send(JSON.stringify({
                username: this.username
            }));
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onclose = () => {
            this.isConnected = false;
            this.updateConnectionStatus('Disconnected', 'disconnected');
            
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                if (this.username && !this.isConnected) {
                    this.connect();
                }
            }, 3000);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus('Connection Error', 'disconnected');
        };
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.updateConnectionStatus('Disconnected', 'disconnected');
    }
    
    joinRoom() {
        const newRoom = this.elements.roomInput.value.trim() || 'general';
        if (newRoom === this.currentRoom) return;
        
        this.disconnect();
        this.currentRoom = newRoom;
        localStorage.setItem('chatRoom', newRoom);
        this.elements.roomName.textContent = `Room: ${newRoom}`;
        this.elements.messages.innerHTML = '';
        this.elements.usersList.innerHTML = '';
        
        if (this.username) {
            this.connect();
        }
    }
    
    leaveRoom() {
        this.disconnect();
        this.addSystemMessage('You left the room');
    }
    
    sendMessage() {
        const message = this.elements.messageInput.value.trim();
        console.log('Attempting to send message:', message);
        console.log('Is connected:', this.isConnected);
        console.log('WebSocket state:', this.ws ? this.ws.readyState : 'No WebSocket');
        
        if (!message) {
            alert('Please enter a message');
            return;
        }
        
        if (!this.isConnected) {
            alert('Not connected to server. Please wait for connection.');
            return;
        }
        
        try {
            this.ws.send(JSON.stringify({
                type: 'chat_message',
                message: message
            }));
            console.log('Message sent successfully');
            this.elements.messageInput.value = '';
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message. Please try again.');
        }
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'chat_message':
                this.addChatMessage(data);
                break;
            case 'user_joined':
                this.addSystemMessage(data.message);
                break;
            case 'user_left':
                this.addSystemMessage(data.message);
                break;
            case 'room_info':
                this.updateRoomInfo(data);
                break;
        }
    }
    
    addChatMessage(data) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${data.username === this.username ? 'own' : 'other'}`;
        
        const header = document.createElement('div');
        header.className = 'message-header';
        header.textContent = `${data.username} • ${this.formatTime(data.timestamp)}`;
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = data.message;
        
        messageDiv.appendChild(header);
        messageDiv.appendChild(content);
        
        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addSystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.textContent = message;
        
        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    updateRoomInfo(data) {
        this.elements.userCount.textContent = `${data.users.length} users`;
        
        this.elements.usersList.innerHTML = '';
        data.users.forEach(user => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${user.username}</strong>
                <br>
                <small>ID: ${user.user_id}</small>
            `;
            this.elements.usersList.appendChild(li);
        });
    }
    
    updateConnectionStatus(status, className) {
        this.elements.connectionStatus.textContent = status;
        this.elements.connectionStatus.className = className;
    }
    
    scrollToBottom() {
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    updateTime() {
        const now = new Date();
        this.elements.currentTime.textContent = now.toLocaleString();
        setTimeout(() => this.updateTime(), 1000);
    }
}

// Initialize chat client when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatClient();
});
