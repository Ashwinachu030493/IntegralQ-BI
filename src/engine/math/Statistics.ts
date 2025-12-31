/**
 * Statistics Engine for Advanced Chart Calculations
 * Provides real statistical methods for Boxplots and Waterfalls
 */
export class Statistics {
    /**
     * Calculates Boxplot Metrics: Min, Q1, Median, Q3, Max
     * Uses the 1.5 * IQR rule for whiskers
     */
    static getQuartiles(sortedData: number[]) {
        if (sortedData.length === 0) {
            return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
        }

        const q1 = this.getQuantile(sortedData, 0.25);
        const median = this.getQuantile(sortedData, 0.50);
        const q3 = this.getQuantile(sortedData, 0.75);
        const iqr = q3 - q1;

        // Whiskers (1.5 * IQR rule for outlier detection)
        const min = Math.max(Math.min(...sortedData), q1 - 1.5 * iqr);
        const max = Math.min(Math.max(...sortedData), q3 + 1.5 * iqr);

        return { min, q1, median, q3, max };
    }

    /**
     * Calculate quantile value using linear interpolation
     */
    private static getQuantile(sorted: number[], q: number): number {
        const pos = (sorted.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;

        if (sorted[base + 1] !== undefined) {
            return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        } else {
            return sorted[base];
        }
    }

    /**
     * Calculates Waterfall Data: Step-by-step cumulative sum
     * Returns range values [start, end] for floating bar rendering
     */
    static getCumulative(data: { name: string; value: number }[]) {
        let runningTotal = 0;
        return data.map(item => {
            const start = runningTotal;
            runningTotal += item.value;
            return {
                name: item.name,
                value: [start, runningTotal], // Range for Floating Bar
                displayValue: item.value,      // Actual value for Label
                isNegative: item.value < 0
            };
        });
    }

    /**
     * Calculate basic descriptive statistics
     */
    static getDescriptive(data: number[]) {
        if (data.length === 0) return { mean: 0, std: 0, count: 0 };

        const count = data.length;
        const mean = data.reduce((a, b) => a + b, 0) / count;
        const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
        const std = Math.sqrt(variance);

        return { mean, std, count };
    }
}
