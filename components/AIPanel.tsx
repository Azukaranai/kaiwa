import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/Store';
import { AIModelType, AIQuery } from '../types';
import { generateAIResponse, summarizeChat } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

const AIPanel: React.FC = () => {
  const { state, dispatch } = useStore();
  const [queryText, setQueryText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const roomQueries = state.aiQueries.filter(q => q.roomId === state.activeRoomId);
  const roomMessages = state.messages.filter(m => m.roomId === state.activeRoomId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [roomQueries, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim() || !state.currentUser || !state.activeRoomId) return;

    const queryId = `ai-q-${Date.now()}`;
    const newQuery: AIQuery = {
      id: queryId,
      roomId: state.activeRoomId,
      userId: state.currentUser.id,
      query: queryText,
      response: '',
      isLoading: true,
      timestamp: Date.now(),
      model: AIModelType.GEMINI_FLASH,
    };

    dispatch({ type: 'ADD_AI_QUERY', payload: newQuery });
    setQueryText('');
    setIsTyping(true);

    // Call Gemini
    const responseText = await generateAIResponse(
        newQuery.query, 
        newQuery.model, 
        roomMessages // Pass chat context
    );

    dispatch({
      type: 'UPDATE_AI_RESPONSE',
      payload: { id: queryId, response: responseText, isLoading: false }
    });
    setIsTyping(false);
  };

  const handleSummarize = async () => {
      if(!state.activeRoomId || !state.currentUser) return;
      
      const queryId = `ai-q-${Date.now()}`;
      dispatch({ 
        type: 'ADD_AI_QUERY', 
        payload: {
            id: queryId,
            roomId: state.activeRoomId,
            userId: state.currentUser.id,
            query: "会話を要約して",
            response: '',
            isLoading: true,
            timestamp: Date.now(),
            model: AIModelType.GEMINI_FLASH,
        } 
      });

      const summary = await summarizeChat(roomMessages);

      dispatch({
        type: 'UPDATE_AI_RESPONSE',
        payload: { id: queryId, response: summary, isLoading: false }
      });
  }

  if (!state.aiPanelOpen) return null;

  return (
    <div className="w-96 fixed right-0 inset-y-0 bg-dark-surface border-l border-dark-border shadow-2xl z-40 flex flex-col transform transition-transform duration-300">
      <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-surface">
        <div className="flex items-center gap-2 text-primary-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <span className="font-bold text-white">Gemini Assistant</span>
        </div>
        <button onClick={() => dispatch({type: 'TOGGLE_AI_PANEL'})} className="text-gray-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        <div className="bg-primary-900/20 border border-primary-500/20 rounded-xl p-3 text-sm text-primary-200">
            <p>👋 こんにちは！Geminiです。現在のチャット履歴を参照して回答できます。</p>
            <button 
                onClick={handleSummarize}
                className="mt-2 text-xs bg-primary-600 hover:bg-primary-500 text-white px-2 py-1 rounded transition-colors"
            >
                ここまでの会話を要約
            </button>
        </div>

        {roomQueries.map(q => (
          <div key={q.id} className="space-y-3">
            {/* User Query */}
            <div className="flex justify-end">
               <div className="bg-dark-bg border border-dark-border rounded-2xl rounded-tr-none px-4 py-2 text-sm text-gray-200 max-w-[85%]">
                 {q.query}
               </div>
            </div>

            {/* AI Response */}
            <div className="flex justify-start gap-2">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
               </div>
               <div className="bg-dark-bg border border-dark-border rounded-2xl rounded-tl-none px-4 py-3 text-sm text-gray-300 max-w-[90%] w-full">
                  {q.isLoading ? (
                     <div className="flex space-x-1 h-5 items-center">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                     </div>
                  ) : (
                    <div className="markdown-body prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{q.response}</ReactMarkdown>
                    </div>
                  )}
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-dark-border bg-dark-bg">
        <form onSubmit={handleSubmit}>
            <div className="relative">
                <input
                    type="text"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="AIに質問する..."
                    className="w-full bg-dark-surface text-white border border-dark-border rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                />
                <button 
                    type="submit"
                    disabled={!queryText.trim() || isTyping}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary-600 rounded-lg text-white hover:bg-primary-500 disabled:opacity-50 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2 text-center">Gemini 2.5 Flashを使用中</p>
        </form>
      </div>
    </div>
  );
};

export default AIPanel;
