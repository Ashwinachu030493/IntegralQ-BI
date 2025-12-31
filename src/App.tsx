import { useState, useMemo } from 'react';
import { Shell } from './components/layout/Shell';
import { UploadWizard } from './components/wizard/UploadWizard';
import { GlassCard } from './components/primitives/GlassCard';
import { ChartRenderer } from './components/visual/ChartRenderer';
import { FilterBar } from './components/interactive/FilterBar';
import { DataInspector } from './components/interactive/DataInspector';
import { AiSummary } from './components/panels/AiSummary';
import { analysisDirector } from './engine/AnalysisDirector';
import { reportService } from './services/ReportService';
import { ChatInterface } from './components/interactive/ChatInterface';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { Header } from './components/layout/Header'; // New Header with Logout
import type { AppState, PipelineResult } from './types';

// Wrapper to decide between Login vs Dashboard
const AuthGuard: React.FC = () => {
  const { user } = useAuth();
  // If no user, show Login. If user exists, show Dashboard.
  return user ? <Dashboard /> : <LoginScreen />;
};

function Dashboard() {
  // Use real user from context
  const { user, signOut } = useAuth();

  const [state, setState] = useState<AppState>('IDLE');
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      const { success, id, error } = await reportService.saveReport(result);
      if (success) {
        alert(`Report saved successfully! ID: ${id}`);
      } else {
        alert(`Save failed: ${error}`);
      }
    } catch (err) {
      console.error('[App] Save error:', err);
      alert('Save failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    setState('PROCESSING');
    try {
      const rawResult = await analysisDirector.runPipeline(files);

      setResult({
        domain: rawResult.domain,
        rowCount: rawResult.rowCount,
        charts: rawResult.charts,
        cleaningLogs: rawResult.cleaningLogs || [],
        ai_narrative: rawResult.ai_narrative,
        sessionId: rawResult.sessionId
      });
      setState('DASHBOARD');
    } catch (e) {
      console.error('[App] Pipeline Failed:', e);
      alert('Pipeline Failed: ' + (e instanceof Error ? e.message : String(e)));
      setState('IDLE');
    }
  };

  // Filter charts based on activeFilter selection
  const filteredCharts = useMemo(() => {
    if (!result || !activeFilter) return result?.charts || [];

    // When filter is active, highlight charts that contain the filter column
    // For MVP: filter charts to show only those with matching data structure
    return result.charts.map(chart => {
      // Check if this chart's data contains the filter column
      const hasFilterColumn = chart.data?.some((row: any) =>
        Object.keys(row).includes(activeFilter)
      );

      if (hasFilterColumn) {
        // Boost confidence for relevant charts
        return { ...chart, confidence: Math.min(1, (chart.confidence || 0) + 0.1) };
      }
      return chart;
    }).sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }, [result, activeFilter]);

  return (
    <Shell state={state}>
      <div className="flex flex-col h-full">
        {/* HEADER with Logout */}
        <Header
          user={{ name: user?.email?.split('@')[0] || 'User', role: 'Analyst' }}
          onLogout={signOut}
        />

        {state === 'IDLE' && <UploadWizard onUpload={handleUpload} />}

        {state === 'PROCESSING' && (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="mt-4 text-indigo-400">Processing Data Pipeline...</p>
          </div>
        )}

        {state === 'DASHBOARD' && result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

            {/* 1. AI NARRATIVE (New Top Section) */}
            {(result as any).ai_narrative && (
              <AiSummary data={(result as any).ai_narrative} />
            )}

            {/* Filter Bar */}
            <FilterBar
              columns={Object.keys(result.charts[0]?.data[0] || { name: '', value: '' })}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              rowCount={result.rowCount}
            />

            {/* KPI Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard title="Total Records">
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-white">{result.rowCount}</span>
                  <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="text-xs bg-gray-700 hover:bg-indigo-600 px-3 py-1.5 rounded text-white transition-colors"
                  >
                    View Data 🔍
                  </button>
                </div>
              </GlassCard>
              <GlassCard title="Active Domain">
                <div className="text-3xl font-bold text-indigo-400">{result.domain.toUpperCase()}</div>
              </GlassCard>
              <GlassCard title="Generated Charts">
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-emerald-400">{filteredCharts.length}</span>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 px-3 py-1.5 rounded text-white transition-colors flex items-center gap-1"
                  >
                    {isSaving ? 'Saving...' : '💾 Save'}
                  </button>
                </div>
              </GlassCard>
            </div>

            {/* DASHBOARD LAYOUT */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* LEFT: Charts (Takes up 2 columns on large screens) */}
              <div className="xl:col-span-2 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredCharts.map(chart => (
                    <GlassCard
                      key={chart.id}
                      title={chart.title}
                      score={Math.round((chart.confidence || 0) * 100)}
                      badge={chart.type}
                      className="min-h-[350px]"
                    >
                      <ChartRenderer config={chart} />
                      <div className="mt-4 pt-4 border-t border-gray-800/50 flex justify-between items-center">
                        <p className="text-sm text-gray-400 italic">💡 {chart.insight}</p>
                        <button className="text-gray-600 hover:text-white transition-colors">⋮</button>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>

              {/* RIGHT: Chat Assistant (Takes up 1 column, sticky) */}
              <div className="xl:col-span-1">
                <div className="sticky top-6">
                  {result.sessionId ? (
                    <ChatInterface sessionId={result.sessionId} />
                  ) : (
                    <GlassCard className="h-full flex items-center justify-center p-8 text-center text-gray-500 border-dashed">
                      Upload data to activate AI Chat
                    </GlassCard>
                  )}
                </div>
              </div>

            </div>

            {/* Data Inspector Modal */}
            <DataInspector
              isOpen={isInspectorOpen}
              onClose={() => setIsInspectorOpen(false)}
              data={result.charts[0]?.data || []}
            />
          </div>
        )}
      </div>
    </Shell>
  );
}

// MAIN APP: Provides Context
function App() {
  return (
    <AuthProvider>
      <AuthGuard />
    </AuthProvider>
  );
}

export default App;
