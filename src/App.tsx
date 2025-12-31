import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext'; // Import New Context
import { LoginScreen } from './components/auth/LoginScreen';
import { Shell } from './components/layout/Shell';
import { Dashboard } from './components/Dashboard';
import { Toaster } from 'sonner';

// 1. Create a "MainContent" component to handle routing/views
const MainContent: React.FC = () => {
  const { user } = useAuth();
  const { sessionId } = useData(); // Access global data, verify persistence
  const [currentView, setCurrentView] = useState<'dashboard' | 'knowledge'>('dashboard');

  if (!user) return <LoginScreen />;

  return (
    <Shell
      currentView={currentView}
      onNavigate={setCurrentView} // Pass navigation handler
      user={{ name: user.email?.split('@')[0] || 'User', role: 'Analyst' }}
    >
      {currentView === 'dashboard' && <Dashboard />}

      {currentView === 'knowledge' && (
        <div className="p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Knowledge Base</h1>
          {sessionId ? (
            <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl text-gray-300">
              <p>✅ Active Session: <span className="text-indigo-400">{sessionId}</span></p>
              <p className="mt-2">Chat history and saved reports will appear here.</p>
              {/* Future: Add <SavedReportsList /> here */}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-20">
              <p>No active analysis session.</p>
              <button onClick={() => setCurrentView('dashboard')} className="text-indigo-400 hover:underline mt-2">
                Go to Dashboard to upload data
              </button>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
};

// 2. Wrap the final App export
function App() {
  return (
    <AuthProvider>
      <DataProvider> {/* Add DataProvider here */}
        <MainContent />
        <Toaster position="top-right" theme="dark" />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
