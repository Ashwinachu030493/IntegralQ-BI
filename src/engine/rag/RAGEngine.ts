/**
 * RAG Engine - Retrieval-Augmented Generation
 * 
 * Combines vector database context retrieval with LLM generation
 * for more accurate, context-aware responses.
 */

import { vectorDB } from './VectorDB';
import type { VectorSearchResult } from './VectorDB';
import { llmBridge } from '../llm/LLMBridge';
import type { Domain } from '../../types';

export interface RAGResponse {
    answer: string;
    sources: VectorSearchResult[];
    confidence: number;
    domain: string;
}

export interface RAGConfig {
    useVectorContext: boolean;
    maxContextDocs: number;
    minRelevanceScore: number;
    includeDataHistory: boolean;
}

const DEFAULT_RAG_CONFIG: RAGConfig = {
    useVectorContext: true,
    maxContextDocs: 3,
    minRelevanceScore: 0.15,
    includeDataHistory: true
};

/**
 * RAG Engine class
 */
class RAGEngine {
    private config: RAGConfig;
    private initialized = false;

    constructor(config: Partial<RAGConfig> = {}) {
        this.config = { ...DEFAULT_RAG_CONFIG, ...config };
    }

    /**
     * Initialize the RAG engine
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        await vectorDB.initialize();
        this.initialized = true;
        console.log('[RAG] Engine initialized');
    }

    /**
     * Generate a RAG-enhanced response
     */
    async generate(
        query: string,
        options: {
            domain?: Domain;
            dataContext?: string;
            systemPrompt?: string;
        } = {}
    ): Promise<RAGResponse> {
        await this.initialize();

        const { domain = 'general', dataContext = '', systemPrompt } = options;

        // Step 1: Retrieve relevant context from vector DB
        let sources: VectorSearchResult[] = [];
        let vectorContext = '';

        if (this.config.useVectorContext) {
            sources = await vectorDB.search(query, {
                topK: this.config.maxContextDocs,
                domain: domain !== 'general' ? domain : undefined,
                minScore: this.config.minRelevanceScore
            });

            if (sources.length > 0) {
                vectorContext = await vectorDB.getContext(query, domain);
            }
        }

        // Step 2: Build the augmented prompt
        const augmentedPrompt = this.buildAugmentedPrompt(
            query,
            vectorContext,
            dataContext,
            domain
        );

        // Step 3: Generate response with LLM
        const defaultSystemPrompt = `You are an expert ${domain} data analyst with access to standard operating procedures and best practices. 
Use the provided context to give accurate, actionable insights. 
If the context doesn't contain relevant information, rely on your general knowledge but note this.
Be specific, cite sources when available, and provide concrete recommendations.`;

        const { text } = await llmBridge.generate({
            systemPrompt: systemPrompt || defaultSystemPrompt,
            userPrompt: augmentedPrompt,
            temperature: 0.4
        });

        // Step 4: Calculate confidence based on context relevance
        const avgScore = sources.length > 0
            ? sources.reduce((sum, s) => sum + s.score, 0) / sources.length
            : 0;
        const confidence = Math.min(1, avgScore + 0.3); // Base confidence + context boost

        return {
            answer: text,
            sources,
            confidence,
            domain
        };
    }

    /**
     * Build the augmented prompt with context
     */
    private buildAugmentedPrompt(
        query: string,
        vectorContext: string,
        dataContext: string,
        domain: string
    ): string {
        const parts: string[] = [];

        // Add domain context
        parts.push(`DOMAIN: ${domain.toUpperCase()}`);
        parts.push('');

        // Add vector database context if available
        if (vectorContext) {
            parts.push(vectorContext);
            parts.push('');
        }

        // Add data context if provided
        if (dataContext) {
            parts.push('CURRENT DATA CONTEXT:');
            parts.push(dataContext);
            parts.push('');
        }

        // Add the user query
        parts.push('USER QUERY:');
        parts.push(query);
        parts.push('');
        parts.push('Please provide a detailed, actionable response based on the above context and your expertise.');

        return parts.join('\n');
    }

    /**
     * Answer a question about uploaded data
     */
    async answerDataQuestion(
        question: string,
        dataStats: {
            rowCount: number;
            columns: string[];
            domain: Domain;
            summary?: string;
        }
    ): Promise<RAGResponse> {
        const dataContext = `
Dataset Overview:
- Rows: ${dataStats.rowCount}
- Columns: ${dataStats.columns.join(', ')}
${dataStats.summary ? `- Summary: ${dataStats.summary}` : ''}
        `.trim();

        return this.generate(question, {
            domain: dataStats.domain,
            dataContext
        });
    }

    /**
     * Generate insights for a specific analysis
     */
    async generateInsights(
        analysisType: 'correlation' | 'trend' | 'anomaly' | 'distribution',
        data: {
            domain: Domain;
            findings: string[];
            metrics: Record<string, number>;
        }
    ): Promise<RAGResponse> {
        const query = `Provide ${analysisType} analysis insights and recommendations`;

        const dataContext = `
Analysis Type: ${analysisType}
Key Findings:
${data.findings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Metrics:
${Object.entries(data.metrics).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
        `.trim();

        return this.generate(query, {
            domain: data.domain,
            dataContext,
            systemPrompt: `You are a senior analytics consultant providing ${analysisType} analysis insights. 
Focus on actionable recommendations and business impact. Be specific and cite relevant best practices.`
        });
    }

    /**
     * Index a new document for future retrieval
     */
    async indexDocument(
        content: string,
        metadata: {
            source: string;
            domain: Domain;
            type: 'sop' | 'data' | 'report' | 'user';
        }
    ): Promise<void> {
        await vectorDB.upsert({
            id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            content,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Get knowledge base statistics
     */
    getStats(): { totalDocs: number; byDomain: Record<string, number>; byType: Record<string, number> } {
        return vectorDB.getStats();
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<RAGConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

// Singleton instance
export const ragEngine = new RAGEngine();

export default ragEngine;
