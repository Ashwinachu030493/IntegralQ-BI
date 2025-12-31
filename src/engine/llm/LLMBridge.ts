/**
 * LLMBridge.ts - LLM Abstraction Layer
 * 
 * Provides an abstraction for LLM API calls.
 * Currently implements a mock response; can be extended for OpenAI, Anthropic, etc.
 */

import type { ChartConfig, Domain, GeneratedReport } from '../../types';

/**
 * LLM configuration options
 */
interface LLMConfig {
    provider: 'mock' | 'openai' | 'anthropic' | 'ollama';
    apiKey?: string;
    model?: string;
    maxTokens?: number;
    baseUrl?: string;  // For Ollama or custom endpoints
    temperature?: number;
}

/**
 * API endpoint configurations
 */
const API_ENDPOINTS = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    ollama: '/api/ollama/generate'  // Via Vite proxy to bypass CORS
};

/**
 * Default models per provider
 */
const DEFAULT_MODELS = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
    ollama: 'gemma3:4b'  // Auto-detect first available model
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LLMConfig = {
    provider: 'ollama',  // Use local Gemma 3 by default
    maxTokens: 2000,
    temperature: 0.7
};

/**
 * Sanitize values for LLM prompt (Excel dates, decimals)
 */
function sanitizeValueForLLM(key: string, value: unknown): unknown {
    // Convert Excel serial dates to readable format
    if ((key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) &&
        typeof value === 'number' && value > 20000 && value < 60000) {
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0]; // "2005-01-25"
    }
    // Round long decimals
    if (typeof value === 'number' && !Number.isInteger(value)) {
        return Math.round(value * 100) / 100;
    }
    return value;
}

/**
 * Sanitize an object for LLM prompt
 */
function sanitizeForLLM(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = sanitizeValueForLLM(key, value);
    }
    return result;
}

/**
 * LLMBridge class for handling LLM interactions
 */
export class LLMBridge {
    private config: LLMConfig;

    constructor(config: Partial<LLMConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Generic generate method for flexible prompts
     */
    async generate(input: {
        systemPrompt: string;
        userPrompt: string;
        temperature?: number;
    }): Promise<{ text: string }> {
        // For mock provider, generate intelligent mock response
        if (this.config.provider === 'mock') {
            return this.generateMockText(input.userPrompt);
        }

        // For Ollama provider, use local LLM
        if (this.config.provider === 'ollama') {
            try {
                const text = await this.callOllamaText(input.systemPrompt, input.userPrompt);
                return { text };
            } catch (error) {
                console.error('[LLMBridge] Ollama failed, using mock fallback:', error);
                return this.generateMockText(input.userPrompt);
            }
        }

        // Other providers (openai, anthropic) - not yet implemented
        console.warn('[LLMBridge] Provider not implemented, using mock:', this.config.provider);
        return this.generateMockText(input.userPrompt);
    }

    /**
     * Generate mock text response based on prompt analysis
     */
    private generateMockText(prompt: string): { text: string } {
        // Analyze prompt to generate contextual response
        const lowerPrompt = prompt.toLowerCase();

        if (lowerPrompt.includes('bluf') || lowerPrompt.includes('executive summary')) {
            return {
                text: 'The analysis reveals significant patterns in the dataset that align with the stated objectives. Key metrics show measurable trends with strong statistical confidence, supporting data-driven strategic decisions.'
            };
        }

        if (lowerPrompt.includes('recommendation')) {
            return {
                text: `Implement automated monitoring dashboards to track key performance indicators identified in this analysis
                Conduct deeper statistical investigation into the highest-correlation relationships discovered
                Establish quarterly review cycles to measure progress against baseline metrics`
            };
        }

        return {
            text: 'Analysis complete. The data exhibits identifiable patterns suitable for further investigation. Statistical relationships have been quantified and actionable insights derived.'
        };
    }

    /**
     * Generate a report based on selected charts and objective
     */
    async generateReport(
        charts: ChartConfig[],
        objective: string,
        domain: Domain
    ): Promise<GeneratedReport> {
        console.log(`[LLMBridge] Generating report with provider: ${this.config.provider}`);

        switch (this.config.provider) {
            case 'openai':
                return this.callOpenAI(charts, objective, domain);
            case 'anthropic':
                return this.callAnthropic(charts, objective, domain);
            case 'ollama':
                return this.callOllama(charts, objective, domain);
            case 'mock':
            default:
                return this.generateMockReport(charts, objective, domain);
        }
    }

    /**
     * Build the prompt for report generation
     */
    // @ts-expect-error Reserved for future LLM API integration
    private _buildPrompt(
        charts: ChartConfig[],
        objective: string,
        domain: Domain
    ): string {
        const chartDescriptions = charts.map((chart, index) =>
            `Chart ${index + 1}: ${chart.title}\n` +
            `  Type: ${chart.type}\n` +
            `  Description: ${chart.description}\n` +
            `  Data Summary: ${JSON.stringify(chart.data.slice(0, 3))}...`
        ).join('\n\n');

        return `
You are a professional data analyst specializing in ${domain} domain analysis.

OBJECTIVE: ${objective}

ANALYSIS CONTEXT:
The following charts have been selected for the executive report:

${chartDescriptions}

INSTRUCTIONS:
1. Write a "Bottom Line Up Front" (BLUF) executive summary
2. Base your analysis STRICTLY on the provided chart data
3. Align findings with the stated objective
4. Provide actionable recommendations
5. Keep the tone professional and concise

FORMAT:
- BLUF Summary (2-3 sentences with the key takeaway)
- Detailed Findings (3-5 bullet points)
- Recommendations (2-3 actionable items)
    `.trim();
    }

    /**
     * Generate mock report (for development/demo)
     */
    private generateMockReport(
        charts: ChartConfig[],
        objective: string,
        domain: Domain
    ): GeneratedReport {
        const chartTypes = charts.map(c => c.type).join(', ');
        const chartTitles = charts.map(c => c.title);

        // Generate domain-specific insights
        const domainInsights = this.getDomainInsights(domain);

        return {
            title: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Analysis Report`,
            sections: [], // Empty for legacy mock - FinalReportGenerator builds proper sections
            blufSummary: `Based on analysis of ${charts.length} visualizations (${chartTypes}), ` +
                `the data reveals ${domainInsights.keyFinding}. ` +
                `This directly addresses the objective: "${objective.slice(0, 100)}..."`,
            detailedFindings: [
                `Analysis of "${chartTitles[0] || 'primary chart'}" shows ${domainInsights.finding1}`,
                `Cross-referencing with ${chartTitles[1] || 'secondary data'} confirms ${domainInsights.finding2}`,
                `Notable pattern: ${domainInsights.pattern}`,
                `Statistical significance: The observed trends demonstrate ${domainInsights.significance}`,
                charts.length > 2
                    ? `Additional context from ${chartTitles[2]} supports these conclusions`
                    : `Further analysis recommended as data scope expands`
            ],
            recommendations: [
                domainInsights.recommendation1,
                domainInsights.recommendation2,
                'Continue monitoring key metrics and adjust strategy based on emerging trends'
            ],
            generatedAt: new Date()
        };
    }

    /**
     * Get domain-specific insight templates
     */
    private getDomainInsights(domain: Domain): Record<string, string> {
        const insights: Record<Domain, Record<string, string>> = {
            finance: {
                keyFinding: 'significant variance patterns that impact bottom-line performance',
                finding1: 'revenue concentration in key segments with growth potential',
                finding2: 'cost structures align with industry benchmarks',
                pattern: 'seasonal fluctuations require quarterly budget adjustments',
                significance: 'correlation between operational efficiency and margin improvements',
                recommendation1: 'Optimize resource allocation to high-performing segments',
                recommendation2: 'Implement rolling forecasts to improve financial agility'
            },
            biology: {
                keyFinding: 'statistically significant correlations between experimental variables',
                finding1: 'treatment groups exhibit measurable response differences',
                finding2: 'control samples remain within expected baseline ranges',
                pattern: 'dose-response relationship follows expected pharmacokinetic curves',
                significance: 'p-values indicate results are unlikely due to chance',
                recommendation1: 'Expand sample size for subgroup analysis',
                recommendation2: 'Consider follow-up studies to validate preliminary findings'
            },
            education: {
                keyFinding: 'performance gaps that can be addressed through targeted intervention',
                finding1: 'student cohorts show varying engagement levels across programs',
                finding2: 'assessment scores correlate with attendance patterns',
                pattern: 'early intervention indicators predict long-term outcomes',
                significance: 'effect sizes suggest practical educational importance',
                recommendation1: 'Implement early warning systems for at-risk students',
                recommendation2: 'Enhance support programs based on identified success factors'
            },
            hr: {
                keyFinding: 'workforce trends that impact organizational effectiveness',
                finding1: 'retention rates vary significantly across departments',
                finding2: 'compensation structures influence employee satisfaction',
                pattern: 'tenure and performance ratings show positive correlation',
                significance: 'engagement metrics predict turnover risk',
                recommendation1: 'Develop targeted retention strategies for critical roles',
                recommendation2: 'Review compensation equity and career development paths'
            },
            general: {
                keyFinding: 'meaningful patterns that warrant further investigation',
                finding1: 'primary variables show expected distributions',
                finding2: 'data quality is sufficient for preliminary conclusions',
                pattern: 'trends align with typical analytical expectations',
                significance: 'relationships between key variables are consistent',
                recommendation1: 'Deepen analysis in areas showing strongest signals',
                recommendation2: 'Collect additional data points to strengthen conclusions'
            }
        };

        return insights[domain];
    }

    /**
     * Call OpenAI API for text generation
     */
    private async callOpenAIText(
        systemPrompt: string,
        userPrompt: string,
        temperature: number = 0.7
    ): Promise<string> {
        if (!this.config.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const model = this.config.model || DEFAULT_MODELS.openai;

        const response = await fetch(API_ENDPOINTS.openai, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: this.config.maxTokens || 2000,
                temperature
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }

    /**
     * Call Anthropic API for text generation
     */
    private async callAnthropicText(
        systemPrompt: string,
        userPrompt: string,
        temperature: number = 0.7
    ): Promise<string> {
        if (!this.config.apiKey) {
            throw new Error('Anthropic API key not configured');
        }

        const model = this.config.model || DEFAULT_MODELS.anthropic;

        const response = await fetch(API_ENDPOINTS.anthropic, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model,
                max_tokens: this.config.maxTokens || 2000,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ],
                temperature
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.content[0]?.text || '';
    }

    /**
     * Call Ollama (local LLM) for text generation
     * Uses proper chat template for Gemma/Llama models
     */
    /**
     * Call Ollama (local LLM) for text generation
     * Simplified logic for Gemma 3 integration
     */
    private async callOllamaText(
        systemPrompt: string,
        userPrompt: string
    ): Promise<string> {
        const baseUrl = API_ENDPOINTS.ollama; // Uses proxy /api/ollama/generate
        // Force model as requested
        const model = "gemma3:4b";

        // console.log(`[LLMBridge] 🔌 Connecting to Ollama (Target: ${model})...`);

        try {
            // GENERIC PROMPT (Works for Gemma, Llama, Mistral)
            // We rely on Ollama's internal templating engine.
            const finalPrompt = `
SYSTEM INSTRUCTIONS:
${systemPrompt}

⛔ CONSTRAINT: Do NOT include conversational filler like "Here is the report", "Based on the data", or "Here's the requested output".
Start directly with the content. Use professional formatting. Be concise and direct.

USER DATA SUMMARY:
${userPrompt}

Please provide a concise Executive Summary based on this data.
`;

            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model,
                    prompt: finalPrompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_ctx: 4096
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ollama Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const result = data.response || '';

            if (!result) throw new Error("Empty response");

            // console.log(`[LLMBridge] ✅ Gemma Responded (` + result.length + ` chars):`, result.substring(0, 50) + '...');
            return result;
        } catch (error) {
            console.error('[LLMBridge] ❌ LLM FAILURE:', error);
            throw new Error('Ollama connection failed. Ensure gemma3:4b is pulled: ollama pull gemma3:4b');
        }
    }

    /**
     * Call OpenAI API for report generation
     */
    private async callOpenAI(
        charts: ChartConfig[],
        objective: string,
        domain: Domain
    ): Promise<GeneratedReport> {
        try {
            const prompt = this.buildReportPrompt(charts, objective, domain);
            const text = await this.callOpenAIText(
                'You are a senior data analyst generating executive reports.',
                prompt,
                0.4
            );
            return this.parseReportResponse(text, charts, objective, domain);
        } catch (error) {
            console.error('[LLMBridge] OpenAI failed:', error);
            return this.generateMockReport(charts, objective, domain);
        }
    }

    /**
     * Call Anthropic API for report generation
     */
    private async callAnthropic(
        charts: ChartConfig[],
        objective: string,
        domain: Domain
    ): Promise<GeneratedReport> {
        try {
            const prompt = this.buildReportPrompt(charts, objective, domain);
            const text = await this.callAnthropicText(
                'You are a senior data analyst generating executive reports.',
                prompt,
                0.4
            );
            return this.parseReportResponse(text, charts, objective, domain);
        } catch (error) {
            console.error('[LLMBridge] Anthropic failed:', error);
            return this.generateMockReport(charts, objective, domain);
        }
    }

    /**
     * Call Ollama for report generation
     */
    private async callOllama(
        charts: ChartConfig[],
        objective: string,
        domain: Domain
    ): Promise<GeneratedReport> {
        try {
            const prompt = this.buildReportPrompt(charts, objective, domain);
            const text = await this.callOllamaText(
                'You are a senior data analyst generating executive reports.',
                prompt
            );
            return this.parseReportResponse(text, charts, objective, domain);
        } catch (error) {
            console.error('[LLMBridge] Ollama failed:', error);
            return this.generateMockReport(charts, objective, domain);
        }
    }

    /**
     * Build report prompt from charts and context
     * Sanitizes data to avoid confusing the LLM with Excel serial numbers
     */
    private buildReportPrompt(
        charts: ChartConfig[],
        objective: string,
        domain: Domain
    ): string {
        // Sanitize chart data before sending to LLM
        const chartDescriptions = charts.map((chart, i) => {
            // Clean the chart data for readability
            const sampleData = chart.data.slice(0, 3).map(row => {
                if (typeof row === 'object' && row !== null) {
                    return sanitizeForLLM(row as Record<string, unknown>);
                }
                return row;
            });
            return `Chart ${i + 1}: ${chart.title} (${chart.type})
Description: ${chart.description}
Sample Data: ${JSON.stringify(sampleData, null, 2)}`;
        }).join('\n\n');

        return `
Analyze the following visualizations for a ${domain} report:

OBJECTIVE: ${objective}

CHARTS:
${chartDescriptions}

Generate a professional executive report with:
1. BLUF Summary: Start with "Bottom Line:" followed by 2-3 sentences with the key business takeaway
2. Detailed Findings: List 3-5 bullet points starting with "-"
3. Recommendations: List 2-3 actionable items starting with "-"

Be specific, reference actual data values, and provide business context.
        `.trim();
    }

    /**
     * Parse LLM response into GeneratedReport format
     */
    private parseReportResponse(
        text: string,
        charts: ChartConfig[],
        objective: string,
        domain: Domain
    ): GeneratedReport {
        // Extract sections from text
        const lines = text.split('\n').filter(l => l.trim());

        // Find BLUF/summary
        let bluf = '';
        const blufIdx = lines.findIndex(l =>
            l.toLowerCase().includes('bluf') ||
            l.toLowerCase().includes('summary') ||
            l.toLowerCase().includes('bottom line')
        );
        if (blufIdx !== -1 && lines[blufIdx + 1]) {
            bluf = lines.slice(blufIdx, blufIdx + 3).join(' ').replace(/^[^:]+:/, '').trim();
        } else {
            bluf = lines.slice(0, 2).join(' ');
        }

        // Extract bullet points as findings
        const findings = lines
            .filter(l => l.trim().startsWith('-') || l.trim().startsWith('•') || /^\d+\./.test(l.trim()))
            .slice(0, 5)
            .map(l => l.replace(/^[-•\d.]+\s*/, '').trim());

        // Extract recommendations
        const recIdx = lines.findIndex(l => l.toLowerCase().includes('recommend'));
        const recommendations = recIdx !== -1
            ? lines.slice(recIdx + 1, recIdx + 4).map(l => l.replace(/^[-•\d.]+\s*/, '').trim())
            : ['Review the data patterns identified', 'Implement monitoring for key metrics'];

        return {
            title: `${domain.charAt(0).toUpperCase() + domain.slice(1)} Analysis Report`,
            sections: [],
            blufSummary: bluf || `Analysis of ${charts.length} visualizations for: ${objective}`,
            detailedFindings: findings.length > 0 ? findings : [
                'Data patterns identified align with objectives',
                'Statistical relationships quantified',
                'Key trends extracted for strategic decisions'
            ],
            recommendations: recommendations.filter(r => r.length > 0),
            generatedAt: new Date()
        };
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<LLMConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current provider
     */
    getProvider(): string {
        return this.config.provider;
    }
}

/**
 * Static test function to verify Ollama connection (via Vite proxy)
 */
export async function testOllamaConnection(): Promise<{ success: boolean; message: string; model?: string }> {
    console.log('🔌 Testing Ollama connection via Vite proxy...');

    try {
        // Step 1: Check if Ollama API is reachable
        const tagsResponse = await fetch('/api/ollama/tags');
        if (!tagsResponse.ok) {
            throw new Error(`Ollama not responding: ${tagsResponse.status}`);
        }

        const tags = await tagsResponse.json();
        const models = tags.models || [];

        if (models.length === 0) {
            return {
                success: false,
                message: 'Ollama running but no models installed. Run: ollama pull gemma3:4b'
            };
        }

        const model = models[0].name;
        console.log(`✅ Found model: ${model}`);

        // Step 2: Send a simple test prompt
        const response = await fetch('/api/ollama/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt: '<start_of_turn>user\nSay exactly: CONNECTION SUCCESSFUL<end_of_turn>\n<start_of_turn>model\n',
                stream: false,
                options: { num_predict: 20 }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Generate failed: ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Ollama responded:', data.response);

        return {
            success: true,
            message: `Connected! Model: ${model}. Response: "${data.response.substring(0, 50)}..."`,
            model
        };

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('❌ Ollama connection failed:', msg);
        return {
            success: false,
            message: `Connection failed: ${msg}. Is Ollama running? Try: ollama serve`
        };
    }
}

// Singleton instance
export const llmBridge = new LLMBridge();

export default llmBridge;
