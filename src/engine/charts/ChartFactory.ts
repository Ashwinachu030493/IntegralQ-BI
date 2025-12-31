/**
 * ChartFactory.ts - Chart Generation Engine
 * 
 * Generates chart configurations based on data structure and domain.
 * Supports: bar, line, scatter, pie, waterfall, heatmap, boxplot, area, radar
 */

import type { ChartConfig, CleanedData, Domain } from '../../types';
import { Statistics } from '../math/Statistics';

/**
 * Chart generation utilities
 */
export class ChartFactory {
    private idCounter = 0;

    /**
     * Format chart title with proper capitalization
     */
    private formatTitle(title: string): string {
        return title
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Helper to safely get value from row handling case sensitivity (snake_case vs Title Case)
     */
    private getValue(row: Record<string, unknown>, key: string): unknown {
        if (row[key] !== undefined) return row[key];

        // Try snake_case version
        const snakeKey = key.toLowerCase().replace(/\s+/g, '_');
        if (row[snakeKey] !== undefined) return row[snakeKey];

        // Try exact match case insensitive
        const lowerKey = key.toLowerCase();
        const foundKey = Object.keys(row).find(k => k.toLowerCase() === lowerKey);

        return foundKey ? row[foundKey] : undefined;
    }

    /**
     * Check if data is suitable for waterfall chart
     * Waterfall charts need: sequential data with cumulative effects (positive AND negative values)
     */
    private isWaterfallSuitable(data: CleanedData): boolean {
        const numericCol = data.numericColumns[0];
        if (!numericCol) return false;

        const values = data.rows
            .map(row => Number(this.getValue(row, numericCol)))
            .filter(v => !isNaN(v));

        if (values.length < 3) return false;

        // Check for both positive and negative values (cumulative effect pattern)
        const hasPositive = values.some(v => v > 0);
        const hasNegative = values.some(v => v < 0);

        // Also check for "Total" or "Net" type columns (financial pattern)
        const hasFinancialPattern = data.categoricalColumns.some(col =>
            /total|net|sum|balance|revenue|cost|expense|profit|loss/i.test(col)
        ) || data.numericColumns.some(col =>
            /total|net|sum|balance|revenue|cost|expense|profit|loss/i.test(col)
        );

        // Waterfall is suitable if: has both +/- values OR has financial pattern columns
        return (hasPositive && hasNegative) || hasFinancialPattern;
    }

    /**
     * Check if chart has valid renderable data
     */
    private hasValidData(chartData: Record<string, unknown>[]): boolean {
        if (!chartData || chartData.length === 0) return false;

        // Check that at least some values are not NaN/null
        return chartData.some(row =>
            Object.values(row).some(v =>
                v !== null && v !== undefined &&
                (typeof v !== 'number' || !isNaN(v))
            )
        );
    }

    /**
     * Generate all applicable chart configurations for the data
     */
    generate(data: CleanedData, domain: Domain): ChartConfig[] {
        const charts: ChartConfig[] = [];

        // 🛡️ INTELLIGENCE: Filter out ID-like columns (e.g. EmpId, OrderId) from visualization
        // unless they are the only numeric columns available.
        let meaningfulNumeric = data.numericColumns.filter(col =>
            !/id|code|key|pk|fk|ssn|uuid|guid/i.test(col)
        );

        // Fallback: If everything was filtered out, use original columns (better than nothing)
        if (meaningfulNumeric.length === 0 && data.numericColumns.length > 0) {
            meaningfulNumeric = data.numericColumns;
        }

        // Create analysis context with refined columns
        const analysisData = { ...data, numericColumns: meaningfulNumeric };

        // Generate charts based on available column types
        if (analysisData.numericColumns.length > 0) {
            // Bar charts for categorical vs numeric
            if (analysisData.categoricalColumns.length > 0) {
                const barChart = this.createBarChart(analysisData);
                if (this.hasValidData(barChart.data as Record<string, unknown>[])) {
                    charts.push(barChart);
                }

                const pieChart = this.createPieChart(analysisData);
                if (this.hasValidData(pieChart.data as Record<string, unknown>[])) {
                    charts.push(pieChart);
                }
            }

            // Line charts for time series or ordered data
            if (analysisData.dateColumns.length > 0 || analysisData.numericColumns.length >= 2) {
                const lineChart = this.createLineChart(analysisData);
                if (this.hasValidData(lineChart.data as Record<string, unknown>[])) {
                    charts.push(lineChart);
                }

                const areaChart = this.createAreaChart(analysisData);
                if (this.hasValidData(areaChart.data as Record<string, unknown>[])) {
                    charts.push(areaChart);
                }
            }

            // Scatter plots for correlation
            if (analysisData.numericColumns.length >= 2) {
                const scatterChart = this.createScatterChart(analysisData);
                if (this.hasValidData(scatterChart.data as Record<string, unknown>[])) {
                    charts.push(scatterChart);
                }
            }

            // Waterfall ONLY if data is suitable (not just because domain is finance)
            if (domain === 'finance' && this.isWaterfallSuitable(analysisData)) {
                const waterfallChart = this.createWaterfallChart(analysisData);
                if (this.hasValidData(waterfallChart.data as Record<string, unknown>[])) {
                    charts.push(waterfallChart);
                }
            }

            // Boxplot for distribution analysis (need enough data points per category)
            if (analysisData.numericColumns.length > 0 && analysisData.categoricalColumns.length > 0 && analysisData.rowCount >= 10) {
                const boxplotChart = this.createBoxplotChart(analysisData);
                if (this.hasValidData(boxplotChart.data as Record<string, unknown>[])) {
                    charts.push(boxplotChart);
                }
            }

            // Heatmap for correlation matrix (need at least 3 numeric columns with enough data)
            if (analysisData.numericColumns.length >= 3 && analysisData.rowCount >= 5) {
                const heatmapChart = this.createHeatmapChart(analysisData);
                if (this.hasValidData(heatmapChart.data as Record<string, unknown>[])) {
                    charts.push(heatmapChart);
                }
            }

            // Radar for multi-dimensional comparison
            if (analysisData.numericColumns.length >= 3 && analysisData.categoricalColumns.length > 0 && analysisData.rowCount >= 5) {
                const radarChart = this.createRadarChart(analysisData);
                if (this.hasValidData(radarChart.data as Record<string, unknown>[])) {
                    charts.push(radarChart);
                }
            }
        }

        return charts;
    }

    /**
     * Create a unique ID for a chart
     */
    private createId(): string {
        return `chart-${++this.idCounter}-${Date.now()}`;
    }

    /**
     * Create bar chart configuration
     */
    private createBarChart(data: CleanedData): ChartConfig {
        const categoryCol = data.categoricalColumns[0];
        const numericCol = data.numericColumns[0];

        // Aggregate and optimize for high cardinality
        const aggregated = this.aggregateByCategory(data.rows, categoryCol, numericCol);

        // DEBUG: Log first few rows and aggregation result
        if (this.idCounter === 1) { // Only log once
            console.log('[ChartFactory] Debug Bar Chart:', {
                categoryCol,
                numericCol,
                firstRow: data.rows[0],
                getValueTest: this.getValue(data.rows[0], numericCol),
                aggregated: aggregated.slice(0, 3)
            });
        }

        const optimized = this.optimizeDistribution(aggregated, categoryCol, numericCol);

        return {
            id: this.createId(),
            type: 'bar',
            title: this.formatTitle(`${numericCol} by ${categoryCol}`),
            description: `Bar chart showing the distribution of ${numericCol} across different ${categoryCol} categories.`,
            data: optimized,
            xAxisKey: categoryCol,
            yAxisKey: numericCol,
            score: 10,
            confidence: 1.0,
            reasoning: 'Bar charts are effective for comparing values across categories.'
        };
    }

    /**
     * Create line chart configuration
     */
    private createLineChart(data: CleanedData): ChartConfig {
        const xCol = data.dateColumns[0] || data.categoricalColumns[0] || data.numericColumns[0];
        const yCol = data.numericColumns.find(c => c !== xCol) || data.numericColumns[0];

        return {
            id: this.createId(),
            type: 'line',
            title: this.formatTitle(`${yCol} Trend`),
            description: `Line chart showing the trend of ${yCol} over ${xCol}.`,
            data: data.rows.slice(0, 50), // Limit for performance
            xAxisKey: xCol,
            yAxisKey: yCol,
            score: 10,
            confidence: 1.0,
            reasoning: 'Line charts are ideal for showing trends over time or ordered sequences.'
        };
    }

    /**
     * Create scatter chart configuration
     */
    private createScatterChart(data: CleanedData): ChartConfig {
        const xCol = data.numericColumns[0];
        const yCol = data.numericColumns[1];

        return {
            id: this.createId(),
            type: 'scatter',
            title: this.formatTitle(`${xCol} vs ${yCol} Correlation`),
            description: `Scatter plot exploring the relationship between ${xCol} and ${yCol}.`,
            data: data.rows.slice(0, 100),
            xAxisKey: xCol,
            yAxisKey: yCol,
            score: 10,
            confidence: 1.0,
            reasoning: 'Scatter plots reveal correlations and patterns between two numeric variables.'
        };
    }

    /**
     * Create pie chart configuration
     */
    private createPieChart(data: CleanedData): ChartConfig {
        const categoryCol = data.categoricalColumns[0];
        const numericCol = data.numericColumns[0];

        // Aggregate and optimize for high cardinality (Top 5 + Others)
        const aggregated = this.aggregateByCategory(data.rows, categoryCol, numericCol);
        const optimized = this.optimizeDistribution(aggregated, categoryCol, numericCol, 5);

        return {
            id: this.createId(),
            type: 'pie',
            title: this.formatTitle(`${numericCol} Distribution by ${categoryCol}`),
            description: `Pie chart showing the proportional distribution of ${numericCol} across ${categoryCol}.`,
            data: optimized,
            xAxisKey: categoryCol,
            yAxisKey: numericCol,
            score: 10,
            confidence: 1.0,
            reasoning: 'Pie charts effectively show part-to-whole relationships.'
        };
    }

    /**
     * Create waterfall chart configuration
     */
    private createWaterfallChart(data: CleanedData): ChartConfig {
        const categoryCol = data.categoricalColumns[0] || 'category';
        const numericCol = data.numericColumns[0];

        // Transform data for waterfall
        const waterfallData = this.transformForWaterfall(data.rows, categoryCol, numericCol);

        return {
            id: this.createId(),
            type: 'waterfall',
            title: this.formatTitle(`${numericCol} Waterfall Analysis`),
            description: `Waterfall chart showing how ${numericCol} builds up or breaks down across categories.`,
            data: waterfallData,
            xAxisKey: categoryCol,
            yAxisKey: numericCol,
            score: 10,
            confidence: 1.0,
            reasoning: 'Waterfall charts excel at showing cumulative effect of sequential positive/negative values.'
        };
    }

    /**
     * Create area chart configuration
     */
    private createAreaChart(data: CleanedData): ChartConfig {
        const xCol = data.dateColumns[0] || data.categoricalColumns[0] || data.numericColumns[0];
        const yCol = data.numericColumns.find(c => c !== xCol) || data.numericColumns[0];

        return {
            id: this.createId(),
            type: 'area',
            title: this.formatTitle(`${yCol} Area Trend`),
            description: `Area chart visualizing the magnitude and trend of ${yCol} over ${xCol}.`,
            data: data.rows.slice(0, 50),
            xAxisKey: xCol,
            yAxisKey: yCol,
            score: 10,
            confidence: 1.0,
            reasoning: 'Area charts emphasize magnitude and cumulative trends.'
        };
    }

    /**
     * Create boxplot chart configuration
     */
    private createBoxplotChart(data: CleanedData): ChartConfig {
        const categoryCol = data.categoricalColumns[0];
        const numericCol = data.numericColumns[0];

        const boxplotData = this.calculateBoxplotStats(data.rows, categoryCol, numericCol);

        return {
            id: this.createId(),
            type: 'boxplot',
            title: this.formatTitle(`${numericCol} Distribution by ${categoryCol}`),
            description: `Box plot showing the statistical distribution of ${numericCol} across ${categoryCol} categories.`,
            data: boxplotData,
            xAxisKey: categoryCol,
            yAxisKey: numericCol,
            score: 10,
            confidence: 1.0,
            reasoning: 'Box plots reveal data distribution, outliers, and quartile information.'
        };
    }

    /**
     * Create heatmap chart configuration
     */
    private createHeatmapChart(data: CleanedData): ChartConfig {
        const correlationData = this.calculateCorrelationMatrix(data.rows, data.numericColumns.slice(0, 5));

        return {
            id: this.createId(),
            type: 'heatmap',
            title: 'Correlation Matrix',
            description: 'Heatmap showing pairwise correlations between numeric variables.',
            data: correlationData,
            xAxisKey: 'variable1',
            yAxisKey: 'variable2',
            score: 10,
            confidence: 1.0,
            reasoning: 'Heatmaps visualize correlation strength between multiple variables simultaneously.'
        };
    }

    /**
     * Create radar chart configuration
     */
    private createRadarChart(data: CleanedData): ChartConfig {
        const categoryCol = data.categoricalColumns[0];
        const metrics = data.numericColumns.slice(0, 5);

        const radarData = this.prepareRadarData(data.rows, categoryCol, metrics);

        return {
            id: this.createId(),
            type: 'radar',
            title: this.formatTitle(`Multi-Metric Comparison by ${categoryCol}`),
            description: `Radar chart comparing ${metrics.length} metrics across ${categoryCol} categories.`,
            data: radarData,
            xAxisKey: 'metric',
            yAxisKey: 'value',
            score: 10,
            confidence: 1.0,
            reasoning: 'Radar charts compare multiple quantitative variables for different categories.'
        };
    }

    /**
     * Aggregate data by category
     */
    private aggregateByCategory(
        rows: Record<string, unknown>[],
        categoryCol: string,
        numericCol: string
    ): Record<string, unknown>[] {
        const aggregation: Record<string, number> = {};

        for (const row of rows) {
            const category = String(this.getValue(row, categoryCol) ?? 'Unknown');
            const value = Number(this.getValue(row, numericCol)) || 0;

            aggregation[category] = (aggregation[category] || 0) + value;
        }

        return Object.entries(aggregation)
            .map(([category, value]) => ({
                [categoryCol]: category,
                [numericCol]: value
            }))
            .sort((a, b) => (b[numericCol] as number) - (a[numericCol] as number));
    }

    /**
     * Optimize distribution for high-cardinality data (Top N + Others)
     * Groups small categories into "Others" to make charts readable
     */
    private optimizeDistribution(
        data: Record<string, unknown>[],
        categoryCol: string,
        numericCol: string,
        topN: number = 7
    ): Record<string, unknown>[] {
        // If data is already small enough, return as-is
        if (data.length <= topN + 1) {
            return data;
        }

        // Take top N
        const topItems = data.slice(0, topN);

        // Sum the rest into "Others"
        const others = data.slice(topN);
        const othersSum = others.reduce((sum, item) => {
            return sum + (Number(this.getValue(item, numericCol)) || 0);
        }, 0);

        // Only add "Others" if there's actually something to group
        if (othersSum > 0) {
            topItems.push({
                [categoryCol]: 'Others',
                [numericCol]: othersSum
            });
        }

        return topItems;
    }

    /**
     * Transform data for waterfall chart with cumulative values
     */
    private transformForWaterfall(
        rows: Record<string, unknown>[],
        categoryCol: string,
        numericCol: string
    ): Record<string, unknown>[] {
        const aggregated = this.aggregateByCategory(rows, categoryCol, numericCol);

        // Convert to format needed by Statistics.getCumulative
        const simpleData = aggregated.slice(0, 6).map(row => ({
            name: String(this.getValue(row, categoryCol) || 'Unknown'),
            value: Number(this.getValue(row, numericCol)) || 0
        }));

        // Use Statistics engine for cumulative calculation
        return Statistics.getCumulative(simpleData);
    }

    /**
     * Calculate boxplot statistics using proper quartile interpolation
     */
    private calculateBoxplotStats(
        rows: Record<string, unknown>[],
        categoryCol: string,
        numericCol: string
    ): Record<string, unknown>[] {
        const grouped: Record<string, number[]> = {};

        for (const row of rows) {
            const category = String(this.getValue(row, categoryCol) ?? 'Unknown');
            const value = Number(this.getValue(row, numericCol));

            if (!isNaN(value)) {
                if (!grouped[category]) grouped[category] = [];
                grouped[category].push(value);
            }
        }

        return Object.entries(grouped)
            .map(([category, values]) => {
                values.sort((a, b) => a - b);
                const stats = Statistics.getQuartiles(values);

                return {
                    name: category,
                    ...stats
                };
            })
            .slice(0, 8); // Limit to 8 groups for readability
    }

    /**
     * Calculate correlation matrix
     */
    private calculateCorrelationMatrix(
        rows: Record<string, unknown>[],
        columns: string[]
    ): Record<string, unknown>[] {
        const result: Record<string, unknown>[] = [];

        for (const col1 of columns) {
            for (const col2 of columns) {
                const correlation = this.pearsonCorrelation(
                    rows.map(r => Number(this.getValue(r, col1)) || 0),
                    rows.map(r => Number(this.getValue(r, col2)) || 0)
                );

                result.push({
                    variable1: col1,
                    variable2: col2,
                    correlation: Math.round(correlation * 100) / 100
                });
            }
        }

        return result;
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
     * Prepare data for radar chart
     */
    private prepareRadarData(
        rows: Record<string, unknown>[],
        categoryCol: string,
        metrics: string[]
    ): Record<string, unknown>[] {
        const categories = [...new Set(rows.map(r => String(this.getValue(r, categoryCol))))].slice(0, 5);

        return metrics.map(metric => {
            const entry: Record<string, unknown> = { metric };

            for (const category of categories) {
                const values = rows
                    .filter(r => String(this.getValue(r, categoryCol)) === category)
                    .map(r => Number(this.getValue(r, metric)) || 0);

                entry[category] = values.length > 0
                    ? values.reduce((a, b) => a + b, 0) / values.length
                    : 0;
            }

            return entry;
        });
    }
}

// Singleton instance
export const chartFactory = new ChartFactory();

export default chartFactory;
