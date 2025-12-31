/**
 * ForecastEngine.ts - Predictive Analytics Module
 * 
 * Generates 6-month forecasts using linear regression:
 * - Identifies time-series columns
 * - Calculates trend slope and intercept
 * - Projects future values with confidence scoring
 */

import { addMonths, format, parseISO, isValid } from 'date-fns';
import type { CleanedData } from '../../types';

/**
 * Forecast result structure
 */
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

/**
 * ForecastEngine - Linear regression-based time series forecasting
 */
export class ForecastEngine {
    /**
     * Generate forecasts for all applicable numeric columns
     */
    static analyze(data: CleanedData, monthsAhead: number = 6): ForecastResult | null {
        if (data.rows.length < 3) {
            console.log('[ForecastEngine] Insufficient data for forecasting');
            return null;
        }

        // Find date column
        const dateColumn = this.findDateColumn(data.headers, data.rows);
        if (!dateColumn) {
            console.log('[ForecastEngine] No date column found');
            return null;
        }

        // Find best numeric column to forecast
        const targetMetric = this.findTargetMetric(data.numericColumns, data.rows);
        if (!targetMetric) {
            console.log('[ForecastEngine] No suitable metric for forecasting');
            return null;
        }

        console.log(`[ForecastEngine] Forecasting ${targetMetric} by ${dateColumn}`);

        return this.generateForecast(data.rows, dateColumn, targetMetric, monthsAhead);
    }

    /**
     * Find the date column in the dataset
     */
    private static findDateColumn(headers: string[], rows: Record<string, unknown>[]): string | null {
        // Pattern 1: Explicit date-like names (hire, date, time, etc.)
        const datePatterns = ['date', 'month', 'year', 'time', 'period', 'quarter', 'hire', 'dob'];

        for (const header of headers) {
            const lowerHeader = header.toLowerCase();
            if (datePatterns.some(p => lowerHeader.includes(p))) {
                // Verify it contains valid date-like values OR Excel serial numbers
                const sample = rows[0][header];
                const numVal = Number(sample);

                // Accept: date strings, years, OR Excel serial dates (30k-60k)
                if (sample && (
                    this.isDateString(String(sample)) ||
                    (!isNaN(numVal) && numVal > 1900 && numVal < 2100) ||  // Year
                    (!isNaN(numVal) && numVal > 30000 && numVal < 60000)   // Excel serial
                )) {
                    return header;
                }
            }
        }

        // Pattern 2: Columns with Excel serial date values (even without date-like names)
        for (const header of headers) {
            const isExcelDateColumn = rows.slice(0, 5).every(row => {
                const val = Number(row[header]);
                return !isNaN(val) && val > 30000 && val < 60000;
            });
            if (isExcelDateColumn) {
                console.log(`[ForecastEngine] Detected Excel serial dates in column: ${header}`);
                return header;
            }
        }

        // Pattern 3: Columns that look like formatted dates
        for (const header of headers) {
            const values = rows.slice(0, 5).map(r => String(r[header] || ''));
            if (values.every(v => this.isDateString(v))) {
                return header;
            }
        }

        return null;
    }

    /**
     * Check if a string looks like a date
     */
    private static isDateString(value: string): boolean {
        if (!value) return false;

        // Common date patterns
        const datePatterns = [
            /^\d{4}-\d{2}-\d{2}$/,     // 2024-01-15
            /^\d{2}\/\d{2}\/\d{4}$/,   // 01/15/2024
            /^\d{2}-\d{2}-\d{4}$/,     // 01-15-2024
            /^[A-Za-z]+ \d{4}$/,       // January 2024
            /^\d{4}$/                   // 2024 (year only)
        ];

        return datePatterns.some(p => p.test(value.trim()));
    }

    /**
     * Find the best metric to forecast (prefer revenue/sales type columns)
     */
    private static findTargetMetric(numericColumns: string[], rows: Record<string, unknown>[]): string | null {
        if (numericColumns.length === 0) return null;

        // Priority keywords for forecasting
        const priorityPatterns = [
            'revenue', 'sales', 'amount', 'total', 'value', 'income',
            'profit', 'cost', 'price', 'quantity', 'count'
        ];

        for (const pattern of priorityPatterns) {
            const match = numericColumns.find(c => c.toLowerCase().includes(pattern));
            if (match) return match;
        }

        // Default to first numeric column with variance
        for (const col of numericColumns) {
            const values = rows.map(r => Number(r[col] || 0));
            const hasVariance = new Set(values).size > 1;
            if (hasVariance) return col;
        }

        return numericColumns[0];
    }

    /**
     * Generate forecast using linear regression
     */
    private static generateForecast(
        rows: Record<string, unknown>[],
        dateKey: string,
        valueKey: string,
        monthsAhead: number
    ): ForecastResult {
        // Pre-process: Convert Excel serial dates to proper Date objects
        const processedRows = rows.map(row => {
            const dateVal = row[dateKey];
            let parsedDate: Date;

            // Handle Excel serial numbers (e.g., 38377)
            if (typeof dateVal === 'number' && dateVal > 20000 && dateVal < 100000) {
                // Excel date serial: days since Dec 30, 1899
                const excelEpoch = new Date(1899, 11, 30);
                parsedDate = new Date(excelEpoch.getTime() + dateVal * 86400000);
                console.log(`[ForecastEngine] Converted Excel serial ${dateVal} to ${parsedDate.toISOString()}`);
            } else {
                parsedDate = this.parseDate(String(dateVal));
            }

            return {
                ...row,
                _parsedDate: parsedDate,
                _dateString: parsedDate.toISOString().split('T')[0]
            };
        }).filter(row => !isNaN(row._parsedDate.getTime())); // Filter invalid dates

        if (processedRows.length < 3) {
            console.log('[ForecastEngine] Not enough valid date rows for forecast');
            return {
                metric: valueKey,
                dateColumn: dateKey,
                trend: 'Stable',
                slope: 0,
                confidence: 'Insufficient Data',
                historicalData: [],
                forecastData: [],
                combinedData: []
            };
        }

        // Sort by parsed date
        const sorted = processedRows.sort((a, b) =>
            a._parsedDate.getTime() - b._parsedDate.getTime()
        );

        // Prepare X (index) and Y (values)
        const n = sorted.length;
        const x = sorted.map((_, i) => i);
        const y = sorted.map(d => Number((d as unknown as Record<string, unknown>)[valueKey]) || 0);

        // Linear Regression: y = mx + b
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
        const sumXX = x.reduce((a, b) => a + b * b, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Determine trend
        let trend: 'Upward' | 'Downward' | 'Stable';
        if (Math.abs(slope) < 0.01 * (sumY / n)) {
            trend = 'Stable';
        } else {
            trend = slope > 0 ? 'Upward' : 'Downward';
        }

        // Generate future data points using last date
        const lastDate = sorted[n - 1]._parsedDate;
        const forecastData: Record<string, unknown>[] = [];

        for (let i = 1; i <= monthsAhead; i++) {
            const nextIndex = n - 1 + i;
            const predictedValue = slope * nextIndex + intercept;
            const nextDate = addMonths(lastDate, i);

            forecastData.push({
                [dateKey]: format(nextDate, 'yyyy-MM-dd'),
                [valueKey]: Math.max(0, Math.round(predictedValue * 100) / 100),
                isForecast: true
            });
        }

        // Prepare historical data with forecast flag
        const historicalData = sorted.map(row => ({
            ...row,
            isForecast: false
        }));

        return {
            metric: valueKey,
            dateColumn: dateKey,
            trend,
            slope: Math.round(slope * 100) / 100,
            confidence: 'Linear Regression (OLS)',
            historicalData,
            forecastData,
            combinedData: [...historicalData, ...forecastData]
        };
    }

    /**
     * Parse various date formats
     */
    private static parseDate(dateStr: string): Date {
        const today = new Date();

        // Handle Excel serial numbers (numbers > 20000 are likely dates)
        const numericValue = Number(dateStr);
        if (!isNaN(numericValue) && numericValue > 20000 && numericValue < 100000) {
            // Excel date serial: days since Dec 30, 1899
            const excelEpoch = new Date(1899, 11, 30);
            const result = new Date(excelEpoch.getTime() + numericValue * 86400000);
            if (isValid(result)) {
                console.log(`[ForecastEngine] Converted Excel serial ${numericValue} to ${result.toISOString()}`);
                return result;
            }
        }

        // Try ISO format first
        try {
            const parsed = parseISO(dateStr);
            if (isValid(parsed)) return parsed;
        } catch { /* parseISO may throw for invalid formats, fallback below */ }

        // Year only (e.g., "2024")
        if (/^\d{4}$/.test(dateStr)) {
            return new Date(parseInt(dateStr), 0, 1);
        }

        // Month Year (e.g., "January 2024")
        const monthMatch = dateStr.match(/^([A-Za-z]+)\s+(\d{4})$/);
        if (monthMatch) {
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthIndex = months.findIndex(m => monthMatch[1].toLowerCase().startsWith(m));
            if (monthIndex !== -1) {
                return new Date(parseInt(monthMatch[2]), monthIndex, 1);
            }
        }

        // Fallback to JS Date parsing
        const fallback = new Date(dateStr);
        return isValid(fallback) ? fallback : today;
    }
}

// Export singleton
export const forecastEngine = ForecastEngine;

export default ForecastEngine;
