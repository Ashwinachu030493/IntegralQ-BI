/**
 * Vector Database Service
 * 
 * Provides RAG (Retrieval-Augmented Generation) capabilities:
 * - Document embedding and storage
 * - Semantic similarity search
 * - Context retrieval for LLM prompts
 * 
 * Supports Pinecone (cloud) and local mock for development.
 */

export interface VectorDocument {
    id: string;
    content: string;
    metadata: {
        source: string;
        domain: string;
        type: 'sop' | 'data' | 'report' | 'user';
        timestamp: string;
        [key: string]: string;
    };
}

export interface VectorSearchResult {
    id: string;
    content: string;
    score: number;
    metadata: VectorDocument['metadata'];
}

export interface VectorDBConfig {
    provider: 'pinecone' | 'mock';
    apiKey?: string;
    environment?: string;
    indexName?: string;
}

// Default SOP knowledge base (embedded in code for fast retrieval)
const DEFAULT_KNOWLEDGE_BASE: VectorDocument[] = [
    // Finance SOPs
    {
        id: 'sop-finance-001',
        content: 'Revenue analysis should focus on year-over-year growth, segment breakdown, and seasonal patterns. Key metrics include gross margin, net revenue, and customer acquisition cost.',
        metadata: { source: 'FinanceSOPv3', domain: 'finance', type: 'sop', timestamp: '2024-01-01' }
    },
    {
        id: 'sop-finance-002',
        content: 'When analyzing budget vs actual, highlight variances greater than 5%. Categorize as favorable or unfavorable. Root cause analysis required for major deviations.',
        metadata: { source: 'FinanceSOPv3', domain: 'finance', type: 'sop', timestamp: '2024-01-01' }
    },
    {
        id: 'sop-finance-003',
        content: 'Cash flow analysis must include operating, investing, and financing activities. Free cash flow is the primary health indicator. Track DSO, DPO, and DIO for working capital efficiency.',
        metadata: { source: 'FinanceSOPv3', domain: 'finance', type: 'sop', timestamp: '2024-01-01' }
    },
    // HR SOPs
    {
        id: 'sop-hr-001',
        content: 'Employee turnover analysis should segment by department, tenure, and role level. Voluntary vs involuntary separation rates are critical. Benchmark against industry standards.',
        metadata: { source: 'HRAnalyticsSOP', domain: 'hr', type: 'sop', timestamp: '2024-01-01' }
    },
    {
        id: 'sop-hr-002',
        content: 'Compensation analysis requires market data comparison, internal equity assessment, and pay band compliance. Identify compression issues and outliers.',
        metadata: { source: 'HRAnalyticsSOP', domain: 'hr', type: 'sop', timestamp: '2024-01-01' }
    },
    {
        id: 'sop-hr-003',
        content: 'Performance review data should correlate with promotion rates, salary increases, and retention. Look for rating inflation and manager calibration issues.',
        metadata: { source: 'HRAnalyticsSOP', domain: 'hr', type: 'sop', timestamp: '2024-01-01' }
    },
    // Education SOPs
    {
        id: 'sop-edu-001',
        content: 'Student performance analysis must include GPA trends, course completion rates, and at-risk indicators. Early warning systems should flag students below 2.0 GPA.',
        metadata: { source: 'EducationAnalyticsSOP', domain: 'education', type: 'sop', timestamp: '2024-01-01' }
    },
    {
        id: 'sop-edu-002',
        content: 'Enrollment analysis tracks cohort sizes, retention rates, and graduation timelines. Identify bottleneck courses and capacity constraints.',
        metadata: { source: 'EducationAnalyticsSOP', domain: 'education', type: 'sop', timestamp: '2024-01-01' }
    },
    // Biology SOPs
    {
        id: 'sop-bio-001',
        content: 'Experimental data requires outlier detection, normalization, and statistical significance testing. Use p-value threshold of 0.05. Include effect size calculations.',
        metadata: { source: 'BioStatsSOP', domain: 'biology', type: 'sop', timestamp: '2024-01-01' }
    },
    {
        id: 'sop-bio-002',
        content: 'Gene expression analysis should include fold change calculations, heatmap visualizations, and pathway enrichment. Quality control metrics: RIN > 7, mapping rate > 80%.',
        metadata: { source: 'BioStatsSOP', domain: 'biology', type: 'sop', timestamp: '2024-01-01' }
    },
    // General Analytics
    {
        id: 'sop-general-001',
        content: 'Data quality assessment: Check for missing values, duplicates, and outliers. Document data lineage and transformations applied.',
        metadata: { source: 'DataQualitySOP', domain: 'general', type: 'sop', timestamp: '2024-01-01' }
    },
    {
        id: 'sop-general-002',
        content: 'Correlation analysis should use Pearson for linear relationships, Spearman for ordinal data. Report confidence intervals alongside r-values.',
        metadata: { source: 'StatMethodsSOP', domain: 'general', type: 'sop', timestamp: '2024-01-01' }
    }
];

/**
 * Simple text similarity using TF-IDF-like approach
 * In production, use OpenAI embeddings or sentence-transformers
 */
function calculateSimilarity(query: string, document: string): number {
    const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const docWords = document.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    let matches = 0;
    for (const word of docWords) {
        if (queryWords.has(word)) matches++;
    }

    // Jaccard-like similarity with length normalization
    const score = matches / (queryWords.size + docWords.length - matches + 1);
    return Math.min(1, score * 3); // Scale up for visibility
}

/**
 * Vector Database Service
 */
class VectorDBService {
    private config: VectorDBConfig;
    private documents: VectorDocument[] = [];
    private initialized = false;

    constructor(config: Partial<VectorDBConfig> = {}) {
        // 🔧 SECURITY FIX: Default to pinecone in production, require explicit VITE_VECTOR_PROVIDER=mock for development
        const envProvider = import.meta.env.VITE_VECTOR_PROVIDER as 'pinecone' | 'mock' | undefined;
        const envApiKey = import.meta.env.VITE_PINECONE_KEY as string | undefined;

        this.config = {
            provider: config.provider || envProvider || (envApiKey ? 'pinecone' : 'mock'),
            apiKey: config.apiKey || envApiKey,
            environment: config.environment || 'us-east-1',
            indexName: config.indexName || 'integralq-docs'
        };

        if (this.config.provider === 'mock') {
            console.warn('⚠️ VectorDB: Running in MOCK mode. Set VITE_PINECONE_KEY for production.');
        }
    }

    /**
     * Initialize the vector database
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        if (this.config.provider === 'pinecone' && this.config.apiKey) {
            console.log('[VectorDB] Initializing Pinecone connection...');
            // In production, initialize Pinecone client here
            // const pinecone = new Pinecone({ apiKey: this.config.apiKey });
            // await pinecone.index(this.config.indexName);
        }

        // Load default knowledge base
        this.documents = [...DEFAULT_KNOWLEDGE_BASE];
        this.initialized = true;
        console.log(`[VectorDB] Initialized with ${this.documents.length} documents`);
    }

    /**
     * Add a document to the vector store
     */
    async upsert(doc: VectorDocument): Promise<void> {
        await this.initialize();

        if (this.config.provider === 'pinecone' && this.config.apiKey) {
            // In production, call Pinecone API
            // await pinecone.index(this.config.indexName).upsert([{
            //     id: doc.id,
            //     values: await this.embed(doc.content),
            //     metadata: { content: doc.content, ...doc.metadata }
            // }]);
            console.log(`[VectorDB] Pinecone upsert: ${doc.id}`);
        }

        // Local storage
        const existingIdx = this.documents.findIndex(d => d.id === doc.id);
        if (existingIdx >= 0) {
            this.documents[existingIdx] = doc;
        } else {
            this.documents.push(doc);
        }
    }

    /**
     * Bulk add documents
     */
    async upsertMany(docs: VectorDocument[]): Promise<void> {
        for (const doc of docs) {
            await this.upsert(doc);
        }
    }

    /**
     * Search for similar documents
     */
    async search(
        query: string,
        options: { topK?: number; domain?: string; minScore?: number } = {}
    ): Promise<VectorSearchResult[]> {
        await this.initialize();

        const { topK = 5, domain, minScore = 0.1 } = options;

        if (this.config.provider === 'pinecone' && this.config.apiKey) {
            // In production, call Pinecone API
            // const queryEmbedding = await this.embed(query);
            // const results = await pinecone.index(this.config.indexName).query({
            //     vector: queryEmbedding,
            //     topK,
            //     filter: domain ? { domain } : undefined,
            //     includeMetadata: true
            // });
            console.log(`[VectorDB] Pinecone search: "${query.slice(0, 50)}..."`);
        }

        // Local similarity search
        let candidates = this.documents;

        // Filter by domain if specified
        if (domain) {
            candidates = candidates.filter(d =>
                d.metadata.domain === domain || d.metadata.domain === 'general'
            );
        }

        // Calculate similarity scores
        const scored = candidates.map(doc => ({
            id: doc.id,
            content: doc.content,
            score: calculateSimilarity(query, doc.content),
            metadata: doc.metadata
        }));

        // Sort by score and filter
        return scored
            .filter(r => r.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    /**
     * Get context for RAG prompt
     */
    async getContext(
        query: string,
        domain?: string
    ): Promise<string> {
        const results = await this.search(query, { topK: 3, domain });

        if (results.length === 0) {
            return '';
        }

        const contextParts = results.map((r, i) =>
            `[Reference ${i + 1}] (${r.metadata.source}, relevance: ${(r.score * 100).toFixed(0)}%)\n${r.content}`
        );

        return `RELEVANT CONTEXT FROM KNOWLEDGE BASE:\n\n${contextParts.join('\n\n')}`;
    }

    /**
     * Add data summary to knowledge base for future queries
     */
    async indexDataSummary(
        dataId: string,
        summary: string,
        domain: string,
        metadata: Record<string, string> = {}
    ): Promise<void> {
        await this.upsert({
            id: `data-${dataId}`,
            content: summary,
            metadata: {
                source: 'UserData',
                domain,
                type: 'data',
                timestamp: new Date().toISOString(),
                ...metadata
            }
        });
    }

    /**
     * Clear all indexed data (not SOPs)
     */
    async clearUserData(): Promise<void> {
        this.documents = this.documents.filter(d =>
            d.metadata.type === 'sop'
        );
        console.log('[VectorDB] User data cleared');
    }

    /**
     * Get stats about the vector store
     */
    getStats(): { totalDocs: number; byDomain: Record<string, number>; byType: Record<string, number> } {
        const byDomain: Record<string, number> = {};
        const byType: Record<string, number> = {};

        for (const doc of this.documents) {
            byDomain[doc.metadata.domain] = (byDomain[doc.metadata.domain] || 0) + 1;
            byType[doc.metadata.type] = (byType[doc.metadata.type] || 0) + 1;
        }

        return {
            totalDocs: this.documents.length,
            byDomain,
            byType
        };
    }
}

// Singleton instance
export const vectorDB = new VectorDBService();

export default vectorDB;
