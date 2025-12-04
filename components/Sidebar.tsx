import React, { useState } from 'react';
import { useStore } from '../context/Store';
import { dataService } from '../services/dataService';

const Sidebar: React.FC = () => {
  const { state, dispatch } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !state.currentUser) return;

    const optimisticRoom = {
        id: `room-${Date.now()}`,
        name: newRoomName,
        createdAt: Date.now(),
        members: [state.currentUser.id],
    };

    dispatch({
      type: 'CREATE_ROOM',
      payload: optimisticRoom,
    });
    setNewRoomName('');
    setIsCreating(false);

    try {
        await dataService.createRoom(optimisticRoom);
    } catch(e) {
        console.error("Failed to create room", e);
    }
  };

  if (!state.currentUser) return null;

  return (
    <div className={`${state.sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-30 w-72 bg-dark-surface/95 backdrop-blur-xl border-r border-dark-border transform transition-transform duration-300 ease-in-out flex flex-col`}>
      
      {/* Header */}
      <div className="p-4 border-b border-dark-border flex items-center justify-between">
        <h2 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
           <span className="w-3 h-3 rounded-full bg-primary-500 animate-pulse"></span>
           Nexus Chat
        </h2>
        <button onClick={() => dispatch({type: 'TOGGLE_SIDEBAR'})} className="md:hidden text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* User Profile Snippet */}
      <div className="p-4">
        <div className="flex items-center gap-3 bg-dark-bg p-3 rounded-xl border border-dark-border">
          <img src={state.currentUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full bg-gray-700" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{state.currentUser.name}</p>
            <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
            </p>
          </div>
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <div className="px-2 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">マイルーム</div>
        {state.rooms.map(room => (
          <button
            key={room.id}
            onClick={() => {
                dispatch({ type: 'SET_ACTIVE_ROOM', payload: room.id });
                if (window.innerWidth < 768) dispatch({ type: 'TOGGLE_SIDEBAR' });
            }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-3 ${
              state.activeRoomId === room.id
                ? 'bg-primary-600/10 text-primary-400 border border-primary-600/20'
                : 'text-gray-400 hover:bg-dark-bg hover:text-gray-200'
            }`}
          >
            <span className="text-lg">{room.name.startsWith('📁') ? '📁' : '#'}</span>
            <span className="truncate">{room.name.replace(/^📁\s*/, '')}</span>
          </button>
        ))}

        {isCreating ? (
          <form onSubmit={handleCreateRoom} className="px-2 py-2">
            <input
              autoFocus
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="ルーム名..."
              className="w-full bg-dark-bg text-sm text-white px-3 py-2 rounded border border-primary-500 focus:outline-none"
              onBlur={() => !newRoomName && setIsCreating(false)}
            />
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-dark-bg flex items-center gap-2 transition-colors mt-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            新規ルーム作成
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-dark-border">
        <div className="text-xs text-gray-500 mb-3">AI Models Available</div>
        <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <span className="text-xs text-gray-400">Gemini Flash (Free)</span>
        </div>
        <button 
            onClick={() => dispatch({type: 'LOGOUT'})}
            className="mt-4 w-full text-xs text-red-400 hover:text-red-300 py-2 border border-red-900/30 rounded bg-red-900/10"
        >
            ログアウト
        </button>
      </div>
    </div>
  );
};

export default Sidebar;