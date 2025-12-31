/**
 * ReportHistory.ts - Report Persistence Service
 */

import type { PipelineResult, ChartConfig, GeneratedReport } from '../../types';

export interface SavedReport {
    id: string;
    title: string;
    domain: string;
    createdAt: Date;
    rowCount: number;
    columnCount: number; // Legacy or derived
    chartCount: number;
    fileNames: string[];
    thumbnailChart?: ChartConfig;
    summary?: string;
    pipelineResult?: PipelineResult;
    generatedReport?: GeneratedReport;
}

export interface ReportHistoryStats {
    totalReports: number;
    byDomain: Record<string, number>;
    totalRowsAnalyzed: number;
}

const STORAGE_KEY = 'integralq_report_history';
const MAX_REPORTS = 50;

class ReportHistoryService {
    private reports: SavedReport[] = [];

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.reports = parsed.map((r: SavedReport) => ({
                    ...r,
                    createdAt: new Date(r.createdAt)
                }));
            }
            console.log(`[ReportHistory] Loaded ${this.reports.length} reports`);
        } catch (e) {
            console.error('[ReportHistory] Failed to load:', e);
            this.reports = [];
        }
    }

    private saveToStorage(): void {
        try {
            const toStore = this.reports.map(r => ({
                ...r,
                pipelineResult: undefined,
                generatedReport: undefined
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
        } catch (e) {
            console.error('[ReportHistory] Failed to save:', e);
        }
    }

    async saveReport(
        result: PipelineResult,
        report?: GeneratedReport,
        title?: string
    ): Promise<SavedReport> {
        const id = `report-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        const savedReport: SavedReport = {
            id,
            title: title || `${result.domain.charAt(0).toUpperCase() + result.domain.slice(1)} Analysis`,
            domain: result.domain,
            createdAt: new Date(),
            rowCount: result.rowCount,
            columnCount: result.stats?.correlations?.length || 0, // Placeholder as columnCount is gone
            chartCount: result.charts.length,
            fileNames: ['Uploaded Data'], // Removed SOP source dependency
            thumbnailChart: result.charts.find((c: ChartConfig) => (c.score || 0) >= 50) || result.charts[0],
            summary: report?.summary?.slice(0, 200) || result.ai_narrative?.summary[0]?.slice(0, 200) || "No summary",
            pipelineResult: result,
            generatedReport: report
        };

        this.reports.unshift(savedReport);

        if (this.reports.length > MAX_REPORTS) {
            this.reports = this.reports.slice(0, MAX_REPORTS);
        }

        this.saveToStorage();
        this.saveFullReport(id, result, report);

        return savedReport;
    }

    private saveFullReport(
        id: string,
        result: PipelineResult,
        report?: GeneratedReport
    ): void {
        try {
            localStorage.setItem(`${STORAGE_KEY}_${id}`, JSON.stringify({
                pipelineResult: result,
                generatedReport: report
            }));
        } catch (e) {
            console.warn('[ReportHistory] Failed to save full report:', e);
        }
    }

    async loadReport(id: string): Promise<{
        pipelineResult: PipelineResult;
        generatedReport?: GeneratedReport;
    } | null> {
        try {
            const stored = localStorage.getItem(`${STORAGE_KEY}_${id}`);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[ReportHistory] Failed to load report:', e);
        }
        return null;
    }

    getReports(): SavedReport[] {
        return this.reports;
    }

    getStats(): ReportHistoryStats {
        const byDomain: Record<string, number> = {};
        let totalRows = 0;

        for (const report of this.reports) {
            byDomain[report.domain] = (byDomain[report.domain] || 0) + 1;
            totalRows += report.rowCount;
        }

        return {
            totalReports: this.reports.length,
            byDomain,
            totalRowsAnalyzed: totalRows
        };
    }
}

export const reportHistory = new ReportHistoryService();
export default reportHistory;
