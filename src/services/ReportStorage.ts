import { supabase } from '../lib/supabase';
import type { ChartConfig } from '../types';

export interface SavedReport {
    id: string;
    title: string;
    domain: string;
    summary: string;
    created_at: string;
    charts: ChartConfig[];
}

export const ReportStorage = {
    // SAVE current analysis
    saveReport: async (userId: string, domain: string, charts: ChartConfig[], summary: string = "Automated Analysis") => {
        const { data, error } = await supabase
            .from('saved_reports')
            .insert([
                {
                    user_id: userId,
                    title: `${domain} Analysis - ${new Date().toLocaleDateString()}`,
                    domain: domain,
                    summary: summary,
                    charts: charts
                }
            ])
            .select();

        if (error) throw error;
        return data[0];
    },

    // FETCH all past reports
    getAllReports: async () => {
        const { data, error } = await supabase
            .from('saved_reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as SavedReport[];
    },

    // LOAD a specific report
    getReportById: async (id: string) => {
        const { data, error } = await supabase
            .from('saved_reports')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as SavedReport;
    }
};
