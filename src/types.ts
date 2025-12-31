// 1. Core Data Types
export type AppState = 'IDLE' | 'PROCESSING' | 'DASHBOARD' | 'ERROR';

export type Domain = 'HR' | 'Sales' | 'Finance' | 'Inventory' | 'General' | 'Retail' | 'Tech' | 'Biology' | 'Education';
export type VisualizationType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'heatmap' | 'boxplot' | 'waterfall';
export type ChartType = VisualizationType;

export interface CleanedData {
    headers: string[];
    data: any[];
    meta: {
        rowCount: number;
        colCount: number;
        types: Record<string, string>;
        originalFileName?: string; // Added for SmartMerger
    };
    cleaningLog?: string[]; // Added for SmartMerger
}

// 2. Statistical Analysis Types
export interface ModelResult {
    modelName: string;
    accuracy: number;
    predictions?: any[];
    details?: string;
}

export interface StatisticalResults {
    summary: any;
    correlations: any[];
    outliers: any[];
    models?: ModelResult[];
}

// 3. Visualization Config
export interface ChartConfig {
    id: string;
    title: string;
    type: VisualizationType;
    data: any[];
    confidence?: number;
    insight?: string;
    reasoning?: string;

    // Extended properties for PDF/History compatibility
    description?: string;
    score?: number;
    xKey?: string;
    yKey?: string;
}

// 4. RAG & SOP Types
export interface SOP {
    id: string;
    domain: Domain;
    rules: string[];
    recommended_charts: string[];
}

export interface DataBlueprint {
    domain: string;
    primary_grain: string;
    summary_insight: string;
    recommended_charts: any[];
}

// 5. Reporting Types
export interface ReportSection {
    title: string;
    content: string;
    charts?: string[]; // IDs
}

export interface ReportContext {
    audience: string;
    tone: string;
    format?: string; // Added optional format for compatibility
}

export interface GeneratedReport {
    id: string;
    title: string;
    sections: ReportSection[];
    summary: string;
    generatedAt: Date;
}

// 6. Pipeline Results
export interface PipelineResult {
    sessionId?: string;
    domain: string;
    rowCount: number;
    charts: ChartConfig[];
    ai_narrative?: {
        title: string;
        summary: string[];
    };

    // Optional extended data for full pipeline context
    data?: any[]; // Raw data
    cleaningLogs?: string[]; // For UI logs
    stats?: StatisticalResults;
    sop?: SOP;
}

// 7. Learning
export interface LearningWeights {
    chartPreference: Record<string, number>;
    domainBias: Record<string, number>;
}
