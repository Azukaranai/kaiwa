export interface User {
  id: string;
  name: string;
  avatar: string; // URL or emoji
  status: 'online' | 'offline' | 'busy';
}

export interface Message {
  id: string;
  userId: string; // 'ai' for AI messages
  roomId: string;
  content: string;
  type: 'text' | 'image' | 'system';
  timestamp: number;
  reactions: Record<string, number>; // emoji -> count
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  members: string[]; // User IDs
}

export enum AIModelType {
  GEMINI_FLASH = 'gemini-2.5-flash',
  GEMINI_PRO = 'gemini-3-pro-preview',
}

export interface AIQuery {
  id: string;
  roomId: string;
  userId: string;
  query: string;
  response: string;
  isLoading: boolean;
  timestamp: number;
  model: AIModelType;
}

// App State Context Type
export interface AppState {
  currentUser: User | null;
  users: User[];
  rooms: Room[];
  messages: Message[];
  activeRoomId: string | null;
  aiQueries: AIQuery[];
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
}

export type AppAction =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'CREATE_ROOM'; payload: Room }
  | { type: 'SET_ACTIVE_ROOM'; payload: string }
  | { type: 'SEND_MESSAGE'; payload: Message }
  | { type: 'ADD_REACTION'; payload: { messageId: string; emoji: string } }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_AI_PANEL' }
  | { type: 'ADD_AI_QUERY'; payload: AIQuery }
  | { type: 'UPDATE_AI_RESPONSE'; payload: { id: string; response: string; isLoading: boolean } };
