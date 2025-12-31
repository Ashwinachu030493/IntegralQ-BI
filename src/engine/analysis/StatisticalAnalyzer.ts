/**
 * StatisticalAnalyzer.ts - The Modeler (Refactored)
 * 
 * Performs statistical analysis on cleaned data including:
 * - Basic descriptive statistics (mean, min, max, stdDev)
 * - Correlation analysis between numeric columns
 * - Linear regression modeling with accuracy/details
 */

import type { CleanedData, StatisticalResults, ModelResult } from '../../types';

/**
 * StatisticalAnalyzer - Computes statistics and runs regression models
 */
export class StatisticalAnalyzer {
    /**
     * Analyze the cleaned data and return statistical results
     */
    analyze(data: CleanedData): StatisticalResults {
        // Derive numeric columns from meta types
        const numericColumns = Object.keys(data.meta.types).filter(col => data.meta.types[col] === 'number');

        // Pass explicit numericColumns to helpers
        const numericSummary = this.calculateDescriptiveStats(data, numericColumns);
        const correlations = this.calculateCorrelations(data, numericColumns);
        const models = this.runRegressionModels(data, correlations, numericColumns);

        return {
            summary: numericSummary,
            correlations,
            outliers: [],
            models
        };
    }

    /**
     * Check if a column is a meaningful metric (not an ID/code)
     * Filters out columns that are identifiers, not business metrics
     */
    private isMeaningfulMetric(columnName: string): boolean {
        const lower = columnName.toLowerCase();

        // Block identifiers from correlation analysis
        const idPatterns = [
            'id', 'code', 'key', 'number', 'num', 'no', 'index',
            'extension', 'phone', 'zip', 'postal', 'ssn', 'pin'
        ];

        // Check if column name contains any ID pattern
        for (const pattern of idPatterns) {
            if (lower.includes(pattern)) {
                return false;
            }
        }

        // Check for common ID column name formats
        if (lower.endsWith('_id') || lower.startsWith('id_')) {
            return false;
        }

        return true;
    }

    /**
     * Get meaningful numeric columns (filters out IDs)
     */
    private getMeaningfulColumns(numericColumns: string[]): string[] {
        return numericColumns.filter(col => this.isMeaningfulMetric(col));
    }

    /**
     * Calculate descriptive statistics for all numeric columns
     */
    private calculateDescriptiveStats(
        data: CleanedData,
        numericColumns: string[]
    ): Record<string, { mean: number; min: number; max: number; stdDev: number }> {
        const summary: Record<string, { mean: number; min: number; max: number; stdDev: number }> = {};

        for (const column of numericColumns) {
            const values = data.data
                .map((row: any) => Number(row[column]))
                .filter((v: number) => !isNaN(v) && isFinite(v));

            if (values.length === 0) continue;

            const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);

            const squaredDiffs = values.map((v: number) => Math.pow(v - mean, 2));
            const variance = squaredDiffs.reduce((a: number, b: number) => a + b, 0) / values.length;
            const stdDev = Math.sqrt(variance);

            summary[column] = {
                mean: Math.round(mean * 100) / 100,
                min: Math.round(min * 100) / 100,
                max: Math.round(max * 100) / 100,
                stdDev: Math.round(stdDev * 100) / 100
            };
        }

        return summary;
    }

    /**
     * Calculate Pearson correlations between all pairs of numeric columns
     */
    private calculateCorrelations(
        data: CleanedData,
        numericColumns: string[]
    ): Array<{ feature1: string; feature2: string; correlation: number }> {
        const correlations: Array<{ feature1: string; feature2: string; correlation: number }> = [];

        // Filter to meaningful metrics only (exclude IDs)
        const numericCols = this.getMeaningfulColumns(numericColumns).slice(0, 10);

        for (let i = 0; i < numericCols.length; i++) {
            for (let j = i + 1; j < numericCols.length; j++) {
                const col1 = numericCols[i];
                const col2 = numericCols[j];

                const values1 = data.data.map((row: any) => Number(row[col1])).filter((v: number) => !isNaN(v));
                const values2 = data.data.map((row: any) => Number(row[col2])).filter((v: number) => !isNaN(v));

                if (values1.length !== values2.length || values1.length < 3) continue;

                const correlation = this.pearsonCorrelation(values1, values2);

                correlations.push({
                    feature1: col1,
                    feature2: col2,
                    correlation: Math.round(correlation * 100) / 100
                });
            }
        }

        // Sort by absolute correlation strength
        return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    }

    /**
     * Calculate Pearson correlation coefficient
     */
    private pearsonCorrelation(x: number[], y: number[]): number {
        const n = x.length;
        if (n === 0) return 0;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
        const sumX2 = x.reduce((a, b) => a + b * b, 0);
        const sumY2 = y.reduce((a, b) => a + b * b, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Run linear regression models on highly correlated pairs
     */
    private runRegressionModels(
        data: CleanedData,
        correlations: Array<{ feature1: string; feature2: string; correlation: number }>,
        numericColumns: string[]
    ): ModelResult[] {
        const models: ModelResult[] = [];

        // Take top 5 most correlated pairs
        const topCorrelations = correlations.slice(0, 5);

        for (const { feature1, feature2, correlation } of topCorrelations) {
            const x = data.data.map((row: any) => Number(row[feature1])).filter((v: number) => !isNaN(v));
            const y = data.data.map((row: any) => Number(row[feature2])).filter((v: number) => !isNaN(v));

            if (x.length < 3 || y.length < 3) continue;

            // Calculate R² (coefficient of determination)
            const rSquared = Math.pow(correlation, 2);

            // Generate insight based on correlation strength
            let insight: string;
            const absCorr = Math.abs(correlation);

            if (absCorr >= 0.8) {
                insight = `Strong ${correlation > 0 ? 'positive' : 'negative'} relationship detected. Changes in ${feature1} strongly predict ${feature2}.`;
            } else if (absCorr >= 0.5) {
                insight = `Moderate ${correlation > 0 ? 'positive' : 'negative'} correlation observed between ${feature1} and ${feature2}.`;
            } else if (absCorr >= 0.3) {
                insight = `Weak ${correlation > 0 ? 'positive' : 'negative'} relationship between ${feature1} and ${feature2}.`;
            } else {
                insight = `Minimal linear relationship between ${feature1} and ${feature2}.`;
            }

            models.push({
                modelName: 'Linear Regression (OLS)',
                accuracy: Math.round(rSquared * 100) / 100,
                details: `${insight} (Correlation: ${correlation.toFixed(2)}, Feature: ${feature1} <-> ${feature2})`
            });
        }

        // If no correlations found, analyze individual numeric columns
        if (models.length === 0 && numericColumns.length > 0) {
            for (const column of numericColumns.slice(0, 3)) {
                const values = data.data.map((row: any) => Number(row[column])).filter((v: number) => !isNaN(v));

                if (values.length < 3) continue;

                const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
                const variance = values.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / values.length;
                const cv = (Math.sqrt(variance) / mean) * 100; // Coefficient of variation

                models.push({
                    modelName: 'Univariate Analysis',
                    accuracy: 0,
                    details: `${column}: ${cv > 50
                        ? `High variability (CV: ${cv.toFixed(1)}%) in ${column} suggests significant dispersion in the data.`
                        : `${column} shows relatively stable distribution (CV: ${cv.toFixed(1)}%).`}`
                });
            }
        }

        return models;
    }
}

// Singleton instance
export const statisticalAnalyzer = new StatisticalAnalyzer();

export default statisticalAnalyzer;
