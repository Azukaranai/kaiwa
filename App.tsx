import React from 'react';
import { StoreProvider, useStore } from './context/Store';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AIPanel from './components/AIPanel';

const AppContent: React.FC = () => {
  const { state } = useStore();

  if (!state.currentUser) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-dark-bg text-white font-sans selection:bg-primary-500/30">
      <Sidebar />
      <div className="flex-1 flex relative w-full h-full overflow-hidden">
        <ChatArea />
        <AIPanel />
      </div>
      
      {/* Mobile Overlay for Sidebar */}
      {state.sidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-20 backdrop-blur-sm" />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;
