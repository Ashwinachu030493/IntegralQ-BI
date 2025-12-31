/**
 * DomainDetector.ts - Domain Detection Engine
 * 
 * Analyzes column names and data patterns to detect the most likely domain.
 * Returns detected domain or 'general' as fallback.
 */

import type { Domain, CleanedData } from '../../types';

/**
 * Domain-specific keywords for detection
 */
const DOMAIN_KEYWORDS: Record<Domain, string[]> = {
    finance: [
        'revenue', 'expense', 'profit', 'loss', 'balance', 'debit', 'credit',
        'asset', 'liability', 'equity', 'income', 'cost', 'price', 'amount',
        'budget', 'forecast', 'actual', 'variance', 'margin', 'roi', 'ebitda',
        'cash', 'flow', 'investment', 'loan', 'interest', 'tax', 'dividend',
        'stock', 'share', 'portfolio', 'transaction', 'account', 'fiscal',
        'quarter', 'annual', 'monthly', 'ytd', 'mtd', 'gross', 'net'
    ],

    biology: [
        'gene', 'protein', 'dna', 'rna', 'cell', 'organism', 'species',
        'sample', 'specimen', 'concentration', 'ph', 'temperature', 'volume',
        'mass', 'weight', 'measurement', 'experiment', 'control', 'trial',
        'patient', 'subject', 'treatment', 'dose', 'dosage', 'efficacy',
        'survival', 'mortality', 'morbidity', 'clinical', 'lab', 'test',
        'result', 'marker', 'biomarker', 'sequence', 'mutation', 'expression'
    ],

    education: [
        'student', 'teacher', 'course', 'class', 'grade', 'score', 'gpa',
        'exam', 'test', 'quiz', 'assignment', 'homework', 'attendance',
        'enrollment', 'graduation', 'semester', 'term', 'academic', 'school',
        'university', 'college', 'department', 'major', 'minor', 'credit',
        'curriculum', 'syllabus', 'lecture', 'tutorial', 'assessment',
        'performance', 'rank', 'percentile', 'pass', 'fail', 'dropout'
    ],

    hr: [
        'employee', 'staff', 'manager', 'department', 'title', 'position',
        'salary', 'wage', 'compensation', 'bonus', 'benefit', 'hire',
        'termination', 'resignation', 'promotion', 'transfer', 'tenure',
        'experience', 'skill', 'training', 'review', 'evaluation', 'rating',
        'attendance', 'leave', 'vacation', 'sick', 'overtime', 'headcount',
        'turnover', 'retention', 'engagement', 'satisfaction', 'diversity'
    ],

    general: [] // Fallback, no specific keywords
};

/**
 * DomainDetector class for intelligent domain detection
 */
export class DomainDetector {
    /**
     * Detect domain from cleaned data
     */
    detect(data: CleanedData): Domain {
        const scores = this.calculateDomainScores(data);

        // Find domain with highest score
        let maxScore = 0;
        let detectedDomain: Domain = 'general';

        for (const [domain, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedDomain = domain as Domain;
            }
        }

        // Require minimum confidence threshold
        const CONFIDENCE_THRESHOLD = 3;
        if (maxScore < CONFIDENCE_THRESHOLD) {
            return 'general';
        }

        console.log(`[DomainDetector] Detected domain: ${detectedDomain} (score: ${maxScore})`);
        return detectedDomain;
    }

    /**
     * Calculate scores for each domain based on keyword matches
     */
    private calculateDomainScores(data: CleanedData): Record<Domain, number> {
        const scores: Record<Domain, number> = {
            finance: 0,
            biology: 0,
            education: 0,
            hr: 0,
            general: 0
        };

        // Combine all text to analyze
        const textToAnalyze = [
            ...data.headers,
            ...this.extractSampleValues(data)
        ].map(s => s.toLowerCase());

        // Check each domain's keywords
        for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
            if (domain === 'general') continue;

            for (const keyword of keywords) {
                const matchCount = textToAnalyze.filter(text =>
                    text.includes(keyword.toLowerCase())
                ).length;

                scores[domain as Domain] += matchCount;
            }
        }

        return scores;
    }

    /**
     * Extract sample string values from data for analysis
     */
    private extractSampleValues(data: CleanedData): string[] {
        const values: string[] = [];
        const sampleSize = Math.min(data.rows.length, 50);

        for (let i = 0; i < sampleSize; i++) {
            const row = data.rows[i];
            for (const value of Object.values(row)) {
                if (typeof value === 'string') {
                    values.push(value);
                }
            }
        }

        return values;
    }

    /**
     * Get confidence level for a detected domain
     */
    getConfidence(data: CleanedData, domain: Domain): number {
        const scores = this.calculateDomainScores(data);
        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

        if (totalScore === 0) return 0;

        return Math.round((scores[domain] / totalScore) * 100);
    }

    /**
     * Get all domain scores for transparency
     */
    getAllScores(data: CleanedData): Record<Domain, { score: number; confidence: number }> {
        const scores = this.calculateDomainScores(data);
        const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

        const results: Record<Domain, { score: number; confidence: number }> = {} as never;

        for (const [domain, score] of Object.entries(scores)) {
            results[domain as Domain] = {
                score,
                confidence: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0
            };
        }

        return results;
    }
}

// Singleton instance
export const domainDetector = new DomainDetector();

export default domainDetector;
