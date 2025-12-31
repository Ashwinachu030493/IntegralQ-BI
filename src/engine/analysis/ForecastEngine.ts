/**
 * ForecastEngine.ts - Predictive Analytics Module
 */

import { addMonths, format } from 'date-fns';
import type { CleanedData } from '../../types';

export interface ForecastResult {
    metric: string;
    dateColumn: string;
    trend: 'Upward' | 'Downward' | 'Stable';
    slope: number;
    confidence: string;
    historicalData: Record<string, unknown>[];
    forecastData: Record<string, unknown>[];
    combinedData: Record<string, unknown>[];
}

export class ForecastEngine {
    static analyze(data: CleanedData, monthsAhead: number = 6): ForecastResult | null {
        if (!data.data || data.data.length < 3) {
            console.log('[ForecastEngine] Insufficient data');
            return null;
        }

        const numericColumns = Object.keys(data.meta.types).filter(k => data.meta.types[k] === 'number');
        const dateColumn = this.findDateColumn(data.headers, data.data);
        if (!dateColumn) return null;

        const targetMetric = this.findTargetMetric(numericColumns);
        if (!targetMetric) return null;

        return this.generateForecast(data.data, dateColumn, targetMetric, monthsAhead);
    }

    private static findDateColumn(headers: string[], rows: any[]): string | null {
        const datePatterns = ['date', 'month', 'year', 'time', 'period', 'quarter', 'hire'];
        for (const header of headers) {
            if (datePatterns.some(p => header.toLowerCase().includes(p))) {
                return header;
            }
        }
        const sample = rows[0];
        for (const header of headers) {
            const val = sample[header];
            if (this.isDateString(String(val))) return header;
        }
        return null;
    }

    private static isDateString(value: string): boolean {
        if (!value) return false;
        return !isNaN(Date.parse(value)) || /^\d{4}-\d{2}-\d{2}$/.test(value);
    }

    private static findTargetMetric(numericColumns: string[]): string | null {
        if (numericColumns.length === 0) return null;
        const priority = numericColumns.find(c => /revenue|sales|profit|income/i.test(c));
        return priority || numericColumns[0];
    }

    private static generateForecast(rows: any[], dateKey: string, valueKey: string, monthsAhead: number): ForecastResult {
        const processed = rows.map(r => ({
            date: new Date(r[dateKey]),
            val: Number(r[valueKey]) || 0,
            original: r
        })).filter(p => !isNaN(p.date.getTime()) && !isNaN(p.val))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (processed.length < 3) throw new Error("Not enough data");

        const x = processed.map((_, i) => i);
        const y = processed.map(p => p.val);
        const n = x.length;

        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, v, i) => a + v * y[i], 0);
        const sumXX = x.reduce((a, v) => a + v * v, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const trend = slope > 0.05 ? 'Upward' : slope < -0.05 ? 'Downward' : 'Stable';
        const lastDate = processed[processed.length - 1].date;

        const forecastData = [];
        for (let i = 1; i <= monthsAhead; i++) {
            const nextDate = addMonths(lastDate, i);
            const nextVal = slope * (n - 1 + i) + intercept;
            const point: any = {};
            point[dateKey] = format(nextDate, 'yyyy-MM-dd');
            point[valueKey] = Math.max(0, nextVal);
            point.isForecast = true;
            forecastData.push(point);
        }

        const historicalData = processed.map(p => ({ ...p.original, isForecast: false }));

        return {
            metric: valueKey,
            dateColumn: dateKey,
            trend,
            slope,
            confidence: "Linear Regression",
            historicalData,
            forecastData,
            combinedData: [...historicalData, ...forecastData]
        };
    }
}

export const forecastEngine = ForecastEngine;
export default ForecastEngine;
