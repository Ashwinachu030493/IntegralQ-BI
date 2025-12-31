// AUTOMATIC ENVIRONMENT SWITCHING
// If we are on Vercel, use the environment variable.
// If we are local, default to localhost.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface BackendResponse {
    session_id: string;
    blueprint: {
        domain: string;
        primary_grain: string;
        summary_insight: string;
    };
    charts: {
        id: string;
        title: string;
        type: string;
        data: any[];
        insight: string;
    }[];
    filename: string;
    stats: {
        rowCount: number;
        columnCount: number;
    };
    data: any[];
    cleaning_log: string[];
    ai_narrative?: { title: string; summary: string[] };
}

export const apiClient = {
    checkHealth: async (): Promise<boolean> => {
        try {
            const res = await fetch(`${API_URL}/health`);
            return res.ok;
        } catch (e) {
            return false;
        }
    },

    analyzeFiles: async (files: File[]): Promise<BackendResponse> => {
        const formData = new FormData();
        formData.append('file', files[0]);

        const response = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend Error: ${errorText}`);
        }

        return response.json();
    },

    // --- NEW CAPABILITIES ---

    // 1. Pagination: Get rows 100-200 without crashing browser
    getDataPage: async (sessionId: string, page: number): Promise<any> => {
        const res = await fetch(`${API_URL}/data?session_id=${sessionId}&page=${page}&limit=100`);
        if (!res.ok) throw new Error('Failed to fetch data page');
        return res.json();
    },

    // 2. Chat: Ask the backend a question
    chat: async (sessionId: string, message: string): Promise<{ response: string }> => {
        const res = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, message })
        });
        if (!res.ok) throw new Error('Chat failed');
        return res.json();
    }
};
