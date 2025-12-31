/**
 * FeedbackLoop.ts - The ML Memory
 * 
 * A LocalStorage-based system to remember which charts the user selects/rejects.
 * Implements a simple reinforcement learning mechanism for user preference learning.
 */

import type { Domain, ChartType, LearningWeights } from '../../types';

const STORAGE_KEY = 'ai_learning_weights';

/**
 * Default weights for all chart types (neutral starting point)
 */
const DEFAULT_CHART_WEIGHT = 5;

/**
 * All supported chart types
 */
const ALL_CHART_TYPES: ChartType[] = [
    'bar', 'line', 'scatter', 'pie', 'waterfall', 'heatmap', 'boxplot', 'area', 'radar'
];

/**
 * FeedbackLoop class for managing user preference learning
 */
export class FeedbackLoop {
    private weights: LearningWeights;

    constructor() {
        this.weights = this.loadWeights();
    }

    /**
     * Load weights from localStorage
     */
    private loadWeights(): LearningWeights {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load learning weights from localStorage:', error);
        }
        return this.initializeDefaultWeights();
    }

    /**
     * Initialize default weights for all domains and chart types
     */
    private initializeDefaultWeights(): LearningWeights {
        const weights: LearningWeights = {};
        const domains: Domain[] = ['finance', 'biology', 'education', 'hr', 'general'];

        for (const domain of domains) {
            weights[domain] = {};
            for (const chartType of ALL_CHART_TYPES) {
                weights[domain][chartType] = DEFAULT_CHART_WEIGHT;
            }
        }

        return weights;
    }

    /**
     * Save weights to localStorage
     */
    private saveWeights(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.weights));
        } catch (error) {
            console.error('Failed to save learning weights to localStorage:', error);
        }
    }

    /**
     * Record user interaction with charts
     * 
     * @param domain - The domain context of the interaction
     * @param selectedTypes - Chart types the user selected (+2 weight)
     * @param rejectedTypes - Chart types the user rejected (-1 weight)
     */
    recordInteraction(
        domain: Domain,
        selectedTypes: ChartType[],
        rejectedTypes: ChartType[]
    ): void {
        // Ensure domain exists in weights
        if (!this.weights[domain]) {
            this.weights[domain] = {};
            for (const chartType of ALL_CHART_TYPES) {
                this.weights[domain][chartType] = DEFAULT_CHART_WEIGHT;
            }
        }

        // Increase weight for selected charts (+2)
        for (const chartType of selectedTypes) {
            const currentWeight = this.weights[domain][chartType] ?? DEFAULT_CHART_WEIGHT;
            this.weights[domain][chartType] = Math.min(currentWeight + 2, 100); // Cap at 100
        }

        // Decrease weight for rejected charts (-1)
        for (const chartType of rejectedTypes) {
            const currentWeight = this.weights[domain][chartType] ?? DEFAULT_CHART_WEIGHT;
            this.weights[domain][chartType] = Math.max(currentWeight - 1, 0); // Floor at 0
        }

        this.saveWeights();

        console.log(`[FeedbackLoop] Recorded interaction for domain '${domain}':`);
        console.log(`  Selected (+2): ${selectedTypes.join(', ') || 'none'}`);
        console.log(`  Rejected (-1): ${rejectedTypes.join(', ') || 'none'}`);
    }

    /**
     * Get the user's preferred chart types for a domain
     * Returns the top 3 highest-weighted chart types
     * 
     * @param domain - The domain to get preferences for
     * @returns Array of top 3 preferred chart types
     */
    getPreferredCharts(domain: Domain): ChartType[] {
        const domainWeights = this.weights[domain];

        if (!domainWeights) {
            // Return default chart types if no preferences recorded
            return ['bar', 'line', 'scatter'];
        }

        // Sort chart types by weight (descending) and take top 3
        const sortedCharts = Object.entries(domainWeights)
            .sort(([, weightA], [, weightB]) => weightB - weightA)
            .slice(0, 3)
            .map(([chartType]) => chartType as ChartType);

        return sortedCharts;
    }

    /**
     * Get all weights for a domain (for debugging/analytics)
     */
    getDomainWeights(domain: Domain): Record<ChartType, number> | undefined {
        return this.weights[domain] as Record<ChartType, number> | undefined;
    }

    /**
     * Get weight for a specific chart type in a domain
     */
    getChartWeight(domain: Domain, chartType: ChartType): number {
        return this.weights[domain]?.[chartType] ?? DEFAULT_CHART_WEIGHT;
    }

    /**
     * Reset all learning weights to defaults
     */
    reset(): void {
        this.weights = this.initializeDefaultWeights();
        this.saveWeights();
        console.log('[FeedbackLoop] All weights reset to defaults');
    }

    /**
     * Export current weights for analysis
     */
    exportWeights(): LearningWeights {
        return { ...this.weights };
    }
}

// Singleton instance for global access
export const feedbackLoop = new FeedbackLoop();

export default feedbackLoop;
