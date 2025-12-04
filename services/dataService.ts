import { User, Room, Message, AIQuery } from '../types';

// --- Configuration ---

// Check if we are running in a build environment (Vite/Next/CRA usually set import.meta.env.PROD or process.env.NODE_ENV)
// If you are deploying the frontend to Vercel, you will set VITE_API_URL in Vercel's Environment Variables.
// We use 'any' cast on import.meta to avoid TypeScript errors if the environment types aren't set up for Vite.
const metaEnv = (import.meta as any).env;
const ENV_API_URL = metaEnv?.VITE_API_URL || process.env.REACT_APP_API_URL;

// Determine if we should use the real backend
// 1. If an API URL is explicitly provided via Env Var, use it.
// 2. If we are in production mode, assume we want the real backend.
// 3. Otherwise, stick to local mock for safety unless manually overridden here.
const USE_REAL_BACKEND = !!ENV_API_URL || metaEnv?.PROD || process.env.NODE_ENV === 'production';

// Set the URLs. 
// If ENV_API_URL is set (e.g. 'https://my-backend.onrender.com/api'), use it.
// Otherwise, fallback to localhost for local testing.
const API_URL = ENV_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = API_URL.replace('/api', ''); // Removes '/api' from the end to get the base URL

console.log(`[DataService] Mode: ${USE_REAL_BACKEND ? 'Real Backend' : 'Mock'}, API: ${API_URL}`);

// Declare global socket variable since we loaded via CDN
declare const io: any;

class LocalDataService {
  private getStore() {
    const saved = localStorage.getItem('nexus-chat-state');
    return saved ? JSON.parse(saved) : null;
  }

  // Socket stubs for local mode
  connectSocket(onMessage: (msg: Message) => void, onReaction: (data: any) => void) {}
  joinRoom(roomId: string) {}
  emitTyping(roomId: string, userName: string) {}

  async login(name: string, email: string, password?: string): Promise<User> {
    await new Promise(r => setTimeout(r, 500));
    // Mock login logic
    if (password && password.length < 4) throw new Error("Password too short");
    
    return {
      id: 'user-' + Date.now(),
      name: name || email.split('@')[0],
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || email}`,
      status: 'online',
    };
  }

  async getRooms(): Promise<Room[]> {
    const store = this.getStore();
    if (store && store.rooms) return store.rooms;
    return [
      { id: 'room-1', name: '📁 勉強会', description: 'ReactとAIについて学ぶ部屋', createdAt: Date.now(), members: [] },
      { id: 'room-2', name: '📁 雑談', description: '息抜き用', createdAt: Date.now(), members: [] },
    ];
  }

  async getMessages(roomId: string): Promise<Message[]> {
    const store = this.getStore();
    if (!store || !store.messages) return [];
    return store.messages.filter((m: Message) => m.roomId === roomId);
  }

  async sendMessage(message: Message): Promise<Message> {
    await new Promise(r => setTimeout(r, 100));
    return message;
  }
  
  async sendReaction(messageId: string, emoji: string): Promise<void> {
    // Local implementation handled by reducer primarily
  }

  async createRoom(room: Room): Promise<Room> {
      return room;
  }
}

class APIDataService {
  private socket: any;

  constructor() {
    if (typeof io !== 'undefined') {
        this.socket = io(SOCKET_URL);
    }
  }

  connectSocket(
      onMessage: (msg: Message) => void, 
      onReaction: (data: {messageId: string, emoji: string}) => void,
      onTyping?: (userName: string) => void,
      onRoomCreated?: (room: Room) => void
  ) {
    if (!this.socket) return;
    
    this.socket.off('receive_message');
    this.socket.on('receive_message', (msg: Message) => {
        onMessage(msg);
    });

    this.socket.off('message_reaction');
    this.socket.on('message_reaction', (data: any) => {
        onReaction(data);
    });
    
    if (onTyping) {
        this.socket.off('user_typing');
        this.socket.on('user_typing', ({ userName }: any) => onTyping(userName));
        this.socket.off('user_stop_typing');
        this.socket.on('user_stop_typing', () => onTyping(''));
    }

    if (onRoomCreated) {
        this.socket.off('room_created');
        this.socket.on('room_created', (room: Room) => onRoomCreated(room));
    }
  }

  joinRoom(roomId: string) {
      if (this.socket) {
          this.socket.emit('join_room', roomId);
      }
  }

  emitTyping(roomId: string, userName: string) {
      if (this.socket) {
          this.socket.emit('typing', { roomId, userName });
          // Auto stop typing after 3 seconds of no calls (managed by UI or simple timeout here)
          setTimeout(() => {
             this.socket.emit('stop_typing', { roomId });
          }, 3000);
      }
  }

  async login(name: string, email: string, password?: string): Promise<User> {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
    }
    return res.json();
  }

  async getRooms(): Promise<Room[]> {
    const res = await fetch(`${API_URL}/rooms`);
    if (!res.ok) return [];
    return res.json();
  }

  async getMessages(roomId: string): Promise<Message[]> {
    const res = await fetch(`${API_URL}/rooms/${roomId}/messages`);
    if (!res.ok) return [];
    return res.json();
  }

  async sendMessage(message: Message): Promise<Message> {
    const res = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
    });
    return res.json();
  }

  async sendReaction(messageId: string, emoji: string): Promise<void> {
    await fetch(`${API_URL}/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
    });
  }
  
  async createRoom(room: Room): Promise<Room> {
    const res = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: room.name, description: room.description, ownerId: room.members[0] })
    });
    return res.json();
  }
}

export const dataService = USE_REAL_BACKEND ? new APIDataService() : new LocalDataService();