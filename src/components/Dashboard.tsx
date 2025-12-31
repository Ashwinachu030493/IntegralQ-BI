import React from 'react';
import { useData } from '../context/DataContext';
import { analysisDirector } from '../engine/AnalysisDirector';
import { UploadWizard } from './wizard/UploadWizard';
import { ChartGrid } from './charts/ChartGrid';
import { ChatInterface } from './interactive/ChatInterface';

export const Dashboard: React.FC = () => {
    const { charts, domain, rowCount, sessionId, setAnalysisResults } = useData();

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
                        </div>
                        <ChartGrid charts={charts} />
                    </div>

                    {/* Right: Chat */}
                    <div className="lg:col-span-1">
                        {sessionId ? (
                            <ChatInterface sessionId={sessionId} />
                        ) : (
                            <div className="p-4 bg-gray-900 rounded-lg text-gray-500">Chat loading...</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
