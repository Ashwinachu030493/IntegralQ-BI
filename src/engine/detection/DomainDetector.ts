/**
 * DomainDetector.ts - Domain Detection Engine
 */

import type { Domain, CleanedData } from '../../types';

const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
    Finance: ['revenue', 'profit', 'cost', 'margin', 'budget', 'expense', 'sales', 'price'],
    HR: ['employee', 'salary', 'tenure', 'department', 'hire', 'termination', 'performance'],
    Biology: ['gene', 'protein', 'cell', 'dna', 'rna', 'species', 'sample'],
    Education: ['student', 'grade', 'score', 'class', 'course', 'exam', 'teacher'],
    Sales: ['customer', 'order', 'lead', 'conversion', 'deal', 'pipeline'],
    Inventory: ['stock', 'sku', 'warehouse', 'quantity', 'item', 'supply'],
    Retail: ['store', 'transaction', 'basket', 'pos', 'merchandise'],
    Tech: ['log', 'error', 'latency', 'uptime', 'server', 'request', 'bug'],
    General: []
};

export class DomainDetector {
    detect(data: CleanedData): Domain {
        let maxScore = 0;
        let detected: Domain = 'General';

        const text = [
            ...data.headers,
            ...this.sampleValues(data)
        ].join(' ').toLowerCase();

        for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
            if (domain === 'General') continue;
            let score = 0;
            for (const kw of keywords) {
                if (text.includes(kw.toLowerCase())) score++;
            }
            if (score > maxScore) {
                maxScore = score;
                detected = domain as Domain;
            }
        }

        return detected;
    }

    private sampleValues(data: CleanedData): string[] {
        if (!data.data || data.data.length === 0) return [];
        const sample = data.data.slice(0, 50);
        const values: string[] = [];
        for (const row of sample) {
            for (const val of Object.values(row)) {
                if (typeof val === 'string') values.push(val);
            }
        }
        return values;
    }

    getConfidence(_data: CleanedData, _domain: Domain): number {
        return 85;
    }
}

export const domainDetector = new DomainDetector();
export default domainDetector;
