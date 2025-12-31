import { apiClient } from '../api/client';
import type { PipelineResult, ChartConfig, VisualizationType } from '../types';

import { universalCleaner } from './cleaning/UniversalCleaner';
import { statisticalAnalyzer } from './analysis/StatisticalAnalyzer';
import { chartFactory } from './charts/ChartFactory';
import { domainDetector } from './detection/DomainDetector';
import { llmBridge } from './llm/LLMBridge';

export const analysisDirector = {
    runPipeline: async (files: File[]): Promise<PipelineResult> => {
        console.log("🚀 Pipeline Started: Sending file to AI Architect...");

        try {
            // 1. Try Backend (SOP Engine)
            const backendRes = await apiClient.analyzeFiles(files);
            console.log("✅ AI Blueprint Received:", backendRes.blueprint);

            const readyCharts: ChartConfig[] = backendRes.charts.map((c: any) => ({
                id: c.id,
                title: c.title,
                type: c.type.toLowerCase() as VisualizationType,
                data: c.data,
                confidence: 1.0,
                insight: c.insight,
                reasoning: "AI-Architected SOP",
                xKey: c.x_key,
                yKey: c.y_key
            }));

            return {
                sessionId: backendRes.session_id,
                domain: backendRes.blueprint.domain as any,
                rowCount: backendRes.stats.rowCount,
                charts: readyCharts,
                ai_narrative: backendRes.ai_narrative
            };

        } catch (error) {
            console.warn("⚠️ Backend Unavailable, switching to Client-Side Engine:", error);

            // 2. Fallback: Client-Side Execution
            const file = files[0];

            // A. Clean
            const cleanData = await universalCleaner.clean(file);
            const detectedDomain = domainDetector.detect(cleanData);

            // B. Analyze (Stats + Charts)
            const stats = statisticalAnalyzer.analyze(cleanData);
            const charts = chartFactory.generate(cleanData, detectedDomain);

            // C. Narrative (Mock LLM)
            const report = await llmBridge.generateReport(charts, "Automated Fallback Analysis", detectedDomain);

            console.log("✅ Client-Side Pipeline Complete");

            return {
                domain: detectedDomain,
                rowCount: cleanData.meta.rowCount,
                charts: charts,
                ai_narrative: {
                    title: report.title,
                    summary: [report.summary]
                },
                cleaningLogs: cleanData.cleaningLog,
                stats: stats
            };
        }
    }
};
