import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GlobalDataProvider, useGlobalData } from './context/GlobalData';
import { LoginScreen } from './components/auth/LoginScreen';
import { Shell } from './components/layout/Shell';
import { Dashboard } from './components/Dashboard';
import { Toaster } from 'sonner';
import { ReportStorage } from './services/ReportStorage';
import type { SavedReport } from './services/ReportStorage';
import { toast } from 'sonner';

// 1. Create a "MainContent" component to handle routing/views
const MainContent: React.FC = () => {
  const { user } = useAuth();
  // Using explicit cast to avoid ghost type errors from cached builds
  const { activeSessionId, setAnalysisResults } = useGlobalData() as any;
  const [currentView, setCurrentView] = useState<'dashboard' | 'knowledge'>('dashboard');

  // Knowledge Base State
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch history when entering 'knowledge' view
  useEffect(() => {
    if (currentView === 'knowledge') {
      setLoadingHistory(true);
      ReportStorage.getAllReports()
        .then(setReports)
        .catch(console.error)
        .finally(() => setLoadingHistory(false));
    }
  }, [currentView]);

  const loadReport = (report: SavedReport) => {
    setAnalysisResults(report.id, report.domain, report.charts, 0); // 0 rows because we don't have raw data, just charts
    setCurrentView('dashboard');
    toast.success(`Loaded ${report.title}`);
  };

  if (!user) return <LoginScreen />;

  return (
    <Shell
      currentView={currentView}
      onNavigate={setCurrentView}
      user={{ name: user.email?.split('@')[0] || 'User', role: 'Analyst' }}
    >
      {currentView === 'dashboard' && <Dashboard />}

      {currentView === 'knowledge' && (
        <div className="p-8 max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Knowledge Base</h1>

          {loadingHistory ? (
            <div className="text-gray-500">Loading history...</div>
          ) : (
            <div className="grid gap-4">
              {reports.length === 0 && <p className="text-gray-500">No saved reports yet.</p>}

              {reports.map((report) => (
                <div key={report.id} className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl flex justify-between items-center hover:border-indigo-500/50 transition-colors group">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{report.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {new Date(report.created_at).toLocaleDateString()} • {report.domain}
                    </p>
                  </div>
                  <button
                    onClick={() => loadReport(report)}
                    className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white px-4 py-2 rounded-lg transition-all"
                  >
                    Load Analysis
                  </button>
                </div>
              ))}
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
      <GlobalDataProvider>
        <MainContent />
        <Toaster position="top-right" theme="dark" />
      </GlobalDataProvider>
    </AuthProvider>
  );
}

export default App;
