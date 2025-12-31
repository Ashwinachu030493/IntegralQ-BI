/**
 * LLMBridge.ts - LLM Abstraction Layer
 */

import type { ChartConfig, Domain, GeneratedReport } from '../../types';

export class LLMBridge {
    async generate(_input: { systemPrompt: string; userPrompt: string; temperature?: number }): Promise<{ text: string }> {
        return { text: "AI Analysis currently unavailable (Mock response)." };
    }

    async generateReport(charts: ChartConfig[], _objective: string, domain: Domain): Promise<GeneratedReport> {
        return {
            id: `rep-${Date.now()}`,
            title: `${domain} Analysis Report`,
            sections: [],
            summary: `Automated analysis for ${domain} based on ${charts.length} charts.`,
            generatedAt: new Date()
        };
    }
}

export const llmBridge = new LLMBridge();
export default llmBridge;
