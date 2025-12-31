// 0. App State Types
export type AppState = 'IDLE' | 'WIZARD' | 'PROCESSING' | 'DASHBOARD';
export type ViewState = 'overview' | 'trends' | 'logs';

// 1. Chart Types
export type VisualizationType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'heatmap' | 'boxplot' | 'waterfall';

export interface ChartConfig {
    id: string;
    title: string;
    type: VisualizationType;
    data: any[];
    confidence?: number;
    insight?: string;
    reasoning?: string;
}

// 2. RAG Blueprint Types (From Backend)
export interface DataBlueprint {
    domain: string;
    primary_grain: string;
    summary_insight: string;
    recommended_charts: any[];
}

// 3. Pipeline Result (Director Output)
export interface PipelineResult {
    sessionId?: string;
    domain: string;
    rowCount: number;
    charts: ChartConfig[];
    ai_narrative?: {
        title: string;
        summary: string[];
    };
    // Kept optional for legacy app compatibility if needed, but intended to be removed
    cleaningLogs?: string[];
}
