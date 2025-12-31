import { apiClient } from '../api/client';
import type { PipelineResult, ChartConfig, VisualizationType } from '../types';

export const analysisDirector = {
    runPipeline: async (files: File[]): Promise<PipelineResult> => {
        console.log("🚀 Pipeline Started: Sending file to AI Architect...");

        // 1. Send to Backend (SOP Engine)
        const backendRes = await apiClient.analyzeFiles(files);

        console.log("✅ AI Blueprint Received:", backendRes.blueprint);

        // 2. Map Backend Charts to Frontend Config
        const readyCharts: ChartConfig[] = backendRes.charts.map((c: any) => ({
            id: c.id,
            title: c.title,
            // Force lowercase to match the VisualizationType union
            type: c.type.toLowerCase() as VisualizationType,
            data: c.data,
            confidence: 1.0,
            insight: c.insight,
            reasoning: "AI-Architected SOP"
        }));

        // 3. Construct Final Result
        return {
            sessionId: backendRes.session_id,
            domain: backendRes.blueprint.domain,
            rowCount: backendRes.stats.rowCount,
            charts: readyCharts,
            ai_narrative: backendRes.ai_narrative
        };
    }
};
