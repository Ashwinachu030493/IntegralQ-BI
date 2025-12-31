import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PipelineResult } from '../types';

export interface SavedReport {
    id: string;
    domain: string;
    stats: Record<string, unknown>;
    charts: unknown[];
    created_at: string;
}

export const reportService = {
    /**
     * Save an analysis report to Supabase
     */
    async saveReport(result: PipelineResult): Promise<{ success: boolean; id?: string; error?: string }> {
        // Check if Supabase is properly configured
        if (!isSupabaseConfigured()) {
            console.warn('[ReportService] Supabase not configured, skipping save');
            return { success: false, error: 'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env' };
        }

        try {
            const { data, error } = await supabase
                .from('reports')
                .insert({
                    domain: result.domain,
                    stats: result.stats,
                    charts: result.charts,
                    sop: result.sop,
                    cleaning_logs: result.cleaningLogs
                })
                .select('id')
                .single();

            if (error) throw error;

            console.log('[ReportService] Report saved:', data.id);
            return { success: true, id: data.id };
        } catch (err) {
            console.error('[ReportService] Save failed:', err);
            return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
    },

    /**
     * Retrieve all saved reports
     */
    async getReports(): Promise<SavedReport[]> {
        if (!isSupabaseConfigured()) {
            console.warn('[ReportService] Supabase not configured');
            return [];
        }

        try {
            const { data, error } = await supabase
                .from('reports')
                .select('id, domain, stats, charts, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('[ReportService] Fetch failed:', err);
            return [];
        }
    },

    /**
     * Get a single report by ID
     */
    async getReportById(id: string): Promise<SavedReport | null> {
        if (!isSupabaseConfigured()) {
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[ReportService] Fetch by ID failed:', err);
            return null;
        }
    }
};
