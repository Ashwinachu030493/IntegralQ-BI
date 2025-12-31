import React from 'react';
import { useGlobalData } from '../context/GlobalData';
import { useAuth } from '../context/AuthContext';
import { analysisDirector } from '../engine/AnalysisDirector';
import { UploadWizard } from './wizard/UploadWizard';
import { ChartGrid } from './charts/ChartGrid';
import { ChatInterface } from './interactive/ChatInterface';
import { ReportStorage } from '../services/ReportStorage';
import { toast } from 'sonner';

export const Dashboard: React.FC = () => {
    const { charts, domain, rowCount, activeSessionId, setAnalysisResults } = useGlobalData() as any;
    const { user } = useAuth();

    const handleUpload = async (files: File[]) => {
        try {
            const result = await analysisDirector.runPipeline(files);

            setAnalysisResults(
                result.sessionId || 'local-session',
                result.domain,
                result.charts,
                result.rowCount
            );

        } catch (error) {
            console.error(error);
            alert("Analysis failed. See console.");
        }
    };

    const handleSave = async () => {
        if (!user || !domain) return;

        const toastId = toast.loading('Saving report to cloud...');
        try {
            await ReportStorage.saveReport(user.id, domain, charts);
            toast.success('Report saved to Knowledge Base!', { id: toastId });
        } catch (e) {
            console.error(e);
            toast.error('Failed to save report', { id: toastId });
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Upload Area */}
            {charts.length === 0 && (
                <UploadWizard onUpload={handleUpload} />
            )}

            {/* Results Area */}
            {charts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Charts */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">
                                {domain} Analysis <span className="text-sm font-normal text-gray-500">({rowCount} rows)</span>
                            </h2>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all border border-gray-700"
                            >
                                <span>💾</span> Save Report
                            </button>
                        </div>
                        <ChartGrid charts={charts} />
                    </div>

                    {/* Right: Chat */}
                    <div className="lg:col-span-1">
                        {activeSessionId ? (
                            <ChatInterface sessionId={activeSessionId} />
                        ) : (
                            <div className="p-4 bg-gray-900 rounded-lg text-gray-500">Chat loading...</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
