/**
 * ReportHistory.ts - Report Persistence Service
 * 
 * Saves and retrieves analysis reports:
 * - Local storage for offline/demo mode
 * - Supabase for authenticated users
 */

import type { PipelineResult, ChartConfig, GeneratedReport } from '../../types';

export interface SavedReport {
    id: string;
    title: string;
    domain: string;
    createdAt: Date;
    rowCount: number;
    columnCount: number;
    chartCount: number;
    fileNames: string[];
    thumbnailChart?: ChartConfig;
    summary?: string;
    // Full data (for loading)
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

/**
 * Report History Service
 */
class ReportHistoryService {
    private reports: SavedReport[] = [];


    constructor() {
        this.loadFromStorage();
    }

    /**
     * Load reports from localStorage
     */
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

    /**
     * Save reports to localStorage
     */
    private saveToStorage(): void {
        try {
            // Store without full pipelineResult to save space
            const toStore = this.reports.map(r => ({
                ...r,
                pipelineResult: undefined, // Don't persist full data in list view
                generatedReport: undefined
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
        } catch (e) {
            console.error('[ReportHistory] Failed to save:', e);
        }
    }

    /**
     * Save a new report
     */
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
            rowCount: result.stats.rowCount,
            columnCount: result.stats.columnCount,
            chartCount: result.charts.length,
            fileNames: result.sop.source ? [result.sop.source] : ['Uploaded Data'],
            thumbnailChart: result.charts.find((c: ChartConfig) => c.score >= 50) || result.charts[0],
            summary: report?.blufSummary?.slice(0, 200) || result.sop.objective?.slice(0, 200),
            pipelineResult: result,
            generatedReport: report
        };

        // Add to beginning of list
        this.reports.unshift(savedReport);

        // Trim to max size
        if (this.reports.length > MAX_REPORTS) {
            this.reports = this.reports.slice(0, MAX_REPORTS);
        }

        this.saveToStorage();

        // Also save full report data separately
        this.saveFullReport(id, result, report);

        console.log(`[ReportHistory] Saved report: ${id}`);
        return savedReport;
    }

    /**
     * Save full report data (for larger storage)
     */
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
            console.warn('[ReportHistory] Failed to save full report (storage full?):', e);
        }
    }

    /**
     * Load full report data
     */
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

    /**
     * Get all saved reports (metadata only)
     */
    getReports(): SavedReport[] {
        return this.reports;
    }

    /**
     * Get recent reports
     */
    getRecentReports(limit: number = 5): SavedReport[] {
        return this.reports.slice(0, limit);
    }

    /**
     * Get reports by domain
     */
    getReportsByDomain(domain: string): SavedReport[] {
        return this.reports.filter(r => r.domain === domain);
    }

    /**
     * Delete a report
     */
    async deleteReport(id: string): Promise<void> {
        this.reports = this.reports.filter(r => r.id !== id);
        this.saveToStorage();

        // Also remove full data
        localStorage.removeItem(`${STORAGE_KEY}_${id}`);

        console.log(`[ReportHistory] Deleted report: ${id}`);
    }

    /**
     * Clear all reports
     */
    async clearAll(): Promise<void> {
        // Remove all full report data
        for (const report of this.reports) {
            localStorage.removeItem(`${STORAGE_KEY}_${report.id}`);
        }

        this.reports = [];
        this.saveToStorage();

        console.log('[ReportHistory] Cleared all reports');
    }

    /**
     * Get statistics
     */
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

    /**
     * Search reports
     */
    searchReports(query: string): SavedReport[] {
        const lowerQuery = query.toLowerCase();
        return this.reports.filter(r =>
            r.title.toLowerCase().includes(lowerQuery) ||
            r.domain.toLowerCase().includes(lowerQuery) ||
            r.summary?.toLowerCase().includes(lowerQuery) ||
            r.fileNames.some(f => f.toLowerCase().includes(lowerQuery))
        );
    }
}

// Singleton instance
export const reportHistory = new ReportHistoryService();

export default reportHistory;
