import { Statistics } from '../math/Statistics';
import type { ChartConfig } from '../../types';

export class ChartFactory {
    static createAll(data: any[]): ChartConfig[] {
        console.log("🔥 NEW CHART FACTORY ACTIVE: Analyzing " + data.length + " rows"); // <--- VERIFICATION LOG

        if (!data || data.length === 0) return [];

        const headers = Object.keys(data[0]);
        const charts: ChartConfig[] = [];

        // 1. INTELLIGENT COLUMN DETECTION (Fixes "Last Name" issue)
        // - CatCol: Must be string, CANNOT be 'name', 'id', 'email'
        const catCol = headers.find(h =>
            !/name|first|last|id|email|phone|date|hire/i.test(h) &&
            (/dept|department|office|role|gender|region|status|city|state/i.test(h) || typeof data[0][h] === 'string')
        );

        // - DateCol: Must look like a date
        const dateCol = headers.find(h => /date|time|joined|hire|created/i.test(h));

        // - NumCol: Must be number, CANNOT be 'id', 'phone', 'zip'
        const numCol = headers.find(h =>
            !/id|phone|zip/i.test(h) &&
            (/salary|comp|amount|revenue|score|rating|age|tenure/i.test(h) || typeof data[0][h] === 'number')
        );

        // - Correlation Cols: Strictly numeric
        const numericCols = headers.filter(h =>
            typeof data[0][h] === 'number' && !/id|phone|zip|year/i.test(h)
        );

        console.log(`🔍 Detected Semantics: Date=[${dateCol}], Cat=[${catCol}], Num=[${numCol}]`);

        // ----------------------------------------------------
        // CHART 1: GROWTH TREND (Area)
        // Logic: Time Series Aggregation (Count by Month)
        // ----------------------------------------------------
        if (dateCol) {
            const timeSeries = this.aggregateTime(data, dateCol);
            charts.push({
                id: 'trend_headcount',
                title: 'Growth: Headcount Over Time',
                type: 'area',
                data: timeSeries,
                confidence: 0.95,
                insight: `Growth trend based on ${dateCol}`,
                reasoning: 'Monthly Time-Series Aggregation'
            });
        }

        // ----------------------------------------------------
        // CHART 2: CATEGORY DISTRIBUTION (Bar)
        // Logic: Count by Department/Office
        // ----------------------------------------------------
        if (catCol) {
            const counts = this.aggregateCount(data, catCol);
            charts.push({
                id: 'dist_category',
                title: `Headcount by ${catCol}`,
                type: 'bar',
                data: counts,
                confidence: 0.90,
                insight: `Distribution across ${catCol}`,
                reasoning: 'Categorical Frequency'
            });
        }

        // ----------------------------------------------------
        // CHART 3: SALARY DISTRIBUTION (Boxplot)
        // Logic: Statistical Spread
        // ----------------------------------------------------
        if (numCol && catCol) {
            const boxData = this.aggregateBoxplot(data, catCol, numCol);
            charts.push({
                id: 'dist_box',
                title: `${numCol} Distribution by ${catCol}`,
                type: 'boxplot',
                data: boxData,
                confidence: 0.85,
                insight: `Salary spread within ${catCol}`,
                reasoning: 'Statistical Variance Analysis'
            });
        }

        // ----------------------------------------------------
        // CHART 4: CORRELATION MATRIX (Heatmap)
        // Logic: Numeric Only (No Dates/IDs)
        // ----------------------------------------------------
        if (numericCols.length >= 2) {
            const heatmapData = this.calculateCorrelation(data, numericCols);
            charts.push({
                id: 'corr_matrix',
                title: 'Key Metric Correlations',
                type: 'heatmap',
                data: heatmapData,
                confidence: 0.80,
                insight: 'Relationships between numeric variables',
                reasoning: 'Pearson Correlation'
            });
        }

        return charts;
    }

    // --- AGGREGATION HELPERS ---

    private static aggregateTime(data: any[], dateCol: string) {
        const buckets: Record<string, number> = {};
        data.forEach(row => {
            const d = new Date(row[dateCol]);
            if (!isNaN(d.getTime())) {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                buckets[key] = (buckets[key] || 0) + 1;
            }
        });
        return Object.entries(buckets)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, value]) => ({ name, value }));
    }

    private static aggregateCount(data: any[], col: string) {
        const counts: Record<string, number> = {};
        data.forEach(row => {
            const key = row[col] || 'Unknown';
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, value]) => ({ name, value }));
    }

    private static aggregateBoxplot(data: any[], catCol: string, numCol: string) {
        const groups: Record<string, number[]> = {};
        data.forEach(row => {
            const key = row[catCol] || 'Unknown';
            const val = Number(row[numCol]);
            if (!isNaN(val)) {
                if (!groups[key]) groups[key] = [];
                groups[key].push(val);
            }
        });
        return Object.entries(groups)
            .map(([name, values]) => {
                values.sort((a, b) => a - b);
                const stats = Statistics.getQuartiles(values);
                return { name, ...stats };
            })
            .slice(0, 8);
    }

    private static calculateCorrelation(data: any[], cols: string[]) {
        const matrix: any[] = [];
        cols.forEach(colX => {
            const xValues = data.map(d => Number(d[colX]) || 0);
            cols.forEach(colY => {
                const yValues = data.map(d => Number(d[colY]) || 0);
                const corr = this.pearson(xValues, yValues);
                matrix.push({ x: colX, y: colY, value: Number(corr.toFixed(2)) });
            });
        });
        return matrix;
    }

    private static pearson(x: number[], y: number[]) {
        const n = x.length;
        if (n === 0) return 0;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return denominator === 0 ? 0 : numerator / denominator;
    }
}
