import React, { createContext, useContext, useReducer, useEffect, ReactNode, PropsWithChildren } from 'react';
import { AppState, AppAction, User, Room, Message, AIQuery } from '../types';
import { dataService } from '../services/dataService';

const INITIAL_STATE: AppState = {
  currentUser: null,
  users: [],
  rooms: [], 
  messages: [],
  activeRoomId: null,
  aiQueries: [],
  sidebarOpen: true,
  aiPanelOpen: false,
};

type AsyncAction = 
  | { type: 'INIT_DATA_SUCCESS'; payload: { rooms: Room[], messages: Message[] } }
  | { type: 'SOCKET_MESSAGE_RECEIVED'; payload: Message }
  | { type: 'SOCKET_REACTION_RECEIVED'; payload: { messageId: string; emoji: string } }
  | { type: 'SOCKET_ROOM_CREATED'; payload: Room }
  | AppAction;

const reducer = (state: AppState, action: AsyncAction): AppState => {
  let newState: AppState;
  switch (action.type) {
    case 'LOGIN':
      newState = { ...state, currentUser: action.payload };
      break;
    case 'LOGOUT':
      newState = { ...state, currentUser: null, activeRoomId: null };
      break;
    case 'INIT_DATA_SUCCESS':
      newState = { 
          ...state, 
          rooms: action.payload.rooms,
          messages: [...state.messages, ...action.payload.messages],
          activeRoomId: state.activeRoomId || (action.payload.rooms.length > 0 ? action.payload.rooms[0].id : null)
      };
      break;
    case 'CREATE_ROOM':
    case 'SOCKET_ROOM_CREATED':
      // Prevent duplicates
      if (state.rooms.some(r => r.id === action.payload.id)) return state;
      newState = { 
          ...state, 
          rooms: [action.payload, ...state.rooms], 
          activeRoomId: action.type === 'CREATE_ROOM' ? action.payload.id : state.activeRoomId 
      };
      break;
    case 'SET_ACTIVE_ROOM':
      newState = { ...state, activeRoomId: action.payload };
      break;
    case 'SEND_MESSAGE':
    case 'SOCKET_MESSAGE_RECEIVED':
      // Prevent duplicates (Optimistic UI vs Socket)
      if (state.messages.some(m => m.id === action.payload.id)) return state;
      newState = { ...state, messages: [...state.messages, action.payload] };
      break;
    case 'ADD_REACTION':
    case 'SOCKET_REACTION_RECEIVED':
        newState = {
            ...state,
            messages: state.messages.map(m => {
                if (m.id === action.payload.messageId) {
                    const currentCount = m.reactions[action.payload.emoji] || 0;
                    return { ...m, reactions: { ...m.reactions, [action.payload.emoji]: currentCount + 1 } };
                }
                return m;
            })
        };
        break;
    case 'TOGGLE_SIDEBAR':
      newState = { ...state, sidebarOpen: !state.sidebarOpen };
      break;
    case 'TOGGLE_AI_PANEL':
      newState = { ...state, aiPanelOpen: !state.aiPanelOpen };
      break;
    case 'ADD_AI_QUERY':
      newState = { ...state, aiQueries: [...state.aiQueries, action.payload] };
      break;
    case 'UPDATE_AI_RESPONSE':
      newState = {
        ...state,
        aiQueries: state.aiQueries.map(q => 
          q.id === action.payload.id 
            ? { ...q, response: action.payload.response, isLoading: action.payload.isLoading } 
            : q
        )
      };
      break;
    default:
      return state;
  }
  
  localStorage.setItem('nexus-chat-state', JSON.stringify(newState));
  return newState;
};

const StoreContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AsyncAction>;
} | undefined>(undefined);

export const StoreProvider = ({ children }: PropsWithChildren<{}>) => {
  const saved = localStorage.getItem('nexus-chat-state');
  const initial = saved ? { ...INITIAL_STATE, ...JSON.parse(saved) } : INITIAL_STATE;
  
  const [state, dispatch] = useReducer(reducer, initial);

  // Initial Data & Socket Setup
  useEffect(() => {
    const initData = async () => {
        try {
            const rooms = await dataService.getRooms();
            dispatch({ 
                 type: 'INIT_DATA_SUCCESS', 
                 payload: { rooms, messages: [] } 
            });
        } catch (e) {
            console.error("Failed to init data", e);
        }
    };
    initData();

    // Connect to Socket and listen for global events
    // In a cleaner app, we might check for "USE_REAL_BACKEND" flag explicitly or infer it
    if ((dataService as any).connectSocket) {
        (dataService as any).connectSocket(
            (msg: Message) => dispatch({ type: 'SOCKET_MESSAGE_RECEIVED', payload: msg }),
            (reaction: {messageId: string, emoji: string}) => dispatch({ type: 'SOCKET_REACTION_RECEIVED', payload: reaction }),
            undefined, // Typing handled in component
            (room: Room) => dispatch({ type: 'SOCKET_ROOM_CREATED', payload: room })
        );
    }
  }, []);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};