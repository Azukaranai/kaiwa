import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/Store';
import { Message } from '../types';
import { dataService } from '../services/dataService';
import ReactMarkdown from 'react-markdown';

const ChatArea: React.FC = () => {
  const { state, dispatch } = useStore();
  const [inputText, setInputText] = useState('');
  const [typingUser, setTypingUser] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeRoom = state.rooms.find(r => r.id === state.activeRoomId);
  const roomMessages = state.messages.filter(m => m.roomId === state.activeRoomId).sort((a, b) => a.timestamp - b.timestamp);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [roomMessages, typingUser]);

  // Join Room & Listen for Typing
  useEffect(() => {
      if (activeRoom && (dataService as any).joinRoom) {
          (dataService as any).joinRoom(activeRoom.id);
          
          // Re-bind listener specific to this component for typing
          if((dataService as any).connectSocket) {
             (dataService as any).connectSocket(
                (msg: Message) => dispatch({ type: 'SOCKET_MESSAGE_RECEIVED', payload: msg }),
                (reaction: {messageId: string, emoji: string}) => dispatch({ type: 'SOCKET_REACTION_RECEIVED', payload: reaction }),
                (userName: string) => setTypingUser(userName), // Handle typing here
                undefined
             );
          }
      }
      return () => setTypingUser('');
  }, [activeRoom?.id, dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
      if (activeRoom && state.currentUser && (dataService as any).emitTyping) {
          (dataService as any).emitTyping(activeRoom.id, state.currentUser.name);
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !state.currentUser || !activeRoom) return;

    // Use a temp ID that won't conflict with DB ids easily (e.g. negative timestamp or uuid)
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      roomId: activeRoom.id,
      userId: state.currentUser.id,
      content: inputText,
      type: 'text',
      timestamp: Date.now(),
      reactions: {},
    };

    dispatch({ type: 'SEND_MESSAGE', payload: optimisticMessage });
    setInputText('');

    try {
        await dataService.sendMessage(optimisticMessage);
    } catch (e) {
        console.error("Failed to send message", e);
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
      dispatch({ type: 'ADD_REACTION', payload: { messageId: msgId, emoji } });
      await dataService.sendReaction(msgId, emoji);
  }

  if (!activeRoom) return <div className="flex-1 flex items-center justify-center text-gray-500">ルームを選択してください</div>;

  return (
    <div className="flex-1 flex flex-col h-screen bg-dark-bg relative">
      {/* Top Bar */}
      <div className="h-16 border-b border-dark-border bg-dark-bg/80 backdrop-blur flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => dispatch({type: 'TOGGLE_SIDEBAR'})} className="md:hidden text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div>
            <h2 className="font-bold text-white text-lg">{activeRoom.name}</h2>
            <p className="text-xs text-gray-500">{activeRoom.members.length + 1} 人の参加者</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => dispatch({ type: 'TOGGLE_AI_PANEL' })}
                className={`p-2 rounded-lg transition-all ${state.aiPanelOpen ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' : 'text-gray-400 hover:bg-dark-surface'}`}
                title="AIアシスタント"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {roomMessages.map((msg) => {
          const isMe = msg.userId === state.currentUser?.id;
          const user = state.users.find(u => u.id === msg.userId) || (isMe ? state.currentUser : { name: 'Unknown', avatar: '' });

          return (
            <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
               {!isMe && <img src={user?.avatar} alt={user?.name} className="w-10 h-10 rounded-full bg-gray-700 flex-shrink-0" />}
               
               <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-baseline gap-2 mb-1">
                      {!isMe && <span className="text-sm font-medium text-gray-300">{user?.name}</span>}
                      <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  
                  <div className={`rounded-2xl px-5 py-3 shadow-sm ${
                      isMe 
                      ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white rounded-tr-none' 
                      : 'bg-dark-surface border border-dark-border text-gray-100 rounded-tl-none'
                  }`}>
                      <div className="markdown-body text-sm leading-relaxed">
                          {/* Basic markdown support only for simplicity */}
                          {msg.content}
                      </div>
                  </div>

                  {/* Reactions Bar */}
                  <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(msg.reactions).map(([emoji, count]) => (
                          <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="bg-dark-surface border border-dark-border text-xs px-1.5 py-0.5 rounded-full text-gray-400 hover:bg-gray-700 transition-colors">
                              {emoji} {count}
                          </button>
                      ))}
                      <button onClick={() => handleReaction(msg.id, '👍')} className="text-gray-500 hover:text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity p-1">👍</button>
                      <button onClick={() => handleReaction(msg.id, '❤️')} className="text-gray-500 hover:text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity p-1">❤️</button>
                      <button onClick={() => handleReaction(msg.id, '😂')} className="text-gray-500 hover:text-gray-300 text-xs opacity-0 group-hover:opacity-100 transition-opacity p-1">😂</button>
                  </div>
               </div>
            </div>
          );
        })}
        
        {typingUser && typingUser !== state.currentUser?.name && (
            <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="animate-pulse">...</span>
                </div>
                <div className="flex items-center">
                    <span className="text-xs text-gray-400">{typingUser} が入力中...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-dark-bg border-t border-dark-border">
        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2 max-w-4xl mx-auto">
          <button type="button" className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-dark-surface transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
          </button>
          
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="メッセージを入力..."
            className="flex-1 bg-dark-surface text-white placeholder-gray-500 border border-dark-border rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
          />
          
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;