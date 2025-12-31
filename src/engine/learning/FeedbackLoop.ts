/**
 * FeedbackLoop.ts - The ML Memory
 */

import type { Domain, ChartType } from '../../types';

const STORAGE_KEY = 'ai_learning_weights';
const DEFAULT_CHART_WEIGHT = 5;
const ALL_CHART_TYPES: ChartType[] = [
    'bar', 'line', 'scatter', 'pie', 'waterfall', 'heatmap', 'boxplot', 'area', 'radar'
];

export class FeedbackLoop {
    private weights: any; // Use any to bypass type mismatch

    constructor() {
        this.weights = this.loadWeights();
    }

    private loadWeights(): any {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch (error) {
            console.warn('Failed to load learning weights:', error);
        }
        return this.initializeDefaultWeights();
    }

    private initializeDefaultWeights(): any {
        const weights: any = {};
        const domains: Domain[] = ['Finance', 'Biology', 'Education', 'HR', 'General', 'Sales', 'Inventory', 'Retail', 'Tech'];

        for (const domain of domains) {
            weights[domain] = {};
            for (const chartType of ALL_CHART_TYPES) {
                weights[domain][chartType] = DEFAULT_CHART_WEIGHT;
            }
        }
        return weights;
    }

    private saveWeights(): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.weights));
        } catch (error) {
            console.error('Failed to save learning weights:', error);
        }
    }

    recordInteraction(domain: Domain, selectedTypes: ChartType[], rejectedTypes: ChartType[]): void {
        if (!this.weights[domain]) {
            this.weights[domain] = {}; // Auto-init
            for (const t of ALL_CHART_TYPES) this.weights[domain][t] = DEFAULT_CHART_WEIGHT;
        }

        for (const t of selectedTypes) {
            const current = this.weights[domain][t] ?? DEFAULT_CHART_WEIGHT;
            this.weights[domain][t] = Math.min(current + 2, 100);
        }

        for (const t of rejectedTypes) {
            const current = this.weights[domain][t] ?? DEFAULT_CHART_WEIGHT;
            this.weights[domain][t] = Math.max(current - 1, 0);
        }

        this.saveWeights();
        console.log(`[FeedbackLoop] Updated weights for ${domain}`);
    }

    getPreferredCharts(domain: Domain): ChartType[] {
        const domainWeights = this.weights[domain];
        if (!domainWeights) return ['bar', 'line', 'scatter'];

        return Object.entries(domainWeights)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 3)
            .map(([t]) => t as ChartType);
    }

    getChartWeight(domain: Domain, chartType: ChartType): number {
        return this.weights[domain]?.[chartType] ?? DEFAULT_CHART_WEIGHT;
    }

    reset(): void {
        this.weights = this.initializeDefaultWeights();
        this.saveWeights();
    }
}

export const feedbackLoop = new FeedbackLoop();
export default feedbackLoop;
