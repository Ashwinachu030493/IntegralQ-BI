/**
 * UniversalCleaner.ts - Data Cleaning Engine
 * 
 * Parses CSV/JSON/Excel files and applies domain-specific cleaning rules.
 * Handles missing values, type coercion, and outliers.
 * NOW: Returns detailed cleaning logs for the Technical Report.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { CleanedData, Domain } from '../../types';
import { getSOP } from '../rag/SOPLibrary';

/**
 * Supported file types
 */
type FileType = 'csv' | 'json' | 'xlsx' | 'xls' | 'unknown';

/**
 * Helper to convert Excel serial date to JS ISO date
 * Excel's "Epoch" is Dec 30, 1899
 */
function excelDateToJSDate(serial: number): string {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
}

/**
 * UniversalCleaner - Handles data ingestion and cleaning with logging
 */
export class UniversalCleaner {
    /**
     * Main cleaning function - processes file and applies domain rules
     * Returns cleaned data WITH detailed cleaning logs
     */
    async clean(file: File, domain: Domain = 'General'): Promise<CleanedData> {
        const cleaningLog: string[] = [];
        const fileType = this.detectFileType(file);

        cleaningLog.push(`[FILE] Ingested: "${file.name}" (${this.formatBytes(file.size)})`);
        cleaningLog.push(`[FORMAT] Detected: ${fileType.toUpperCase()}`);

        const rawData = await this.parseFile(file, fileType);

        // DETECT AND FIX EXCEL DATES
        if (rawData.rows.length > 0) {
            const potentialDateCols = rawData.headers.filter(h =>
                /date|time|dob|hire/i.test(h)
            );

            if (potentialDateCols.length > 0) {
                console.log(`📅 Normalizing Dates in columns: ${potentialDateCols.join(', ')}`);

                rawData.rows = rawData.rows.map(row => {
                    const newRow = { ...row };
                    potentialDateCols.forEach(col => {
                        const val = newRow[col];
                        if (typeof val === 'number' && val > 30000 && val < 60000) {
                            newRow[col] = excelDateToJSDate(val);
                        }
                    });
                    return newRow;
                });
            }
        }

        const sop = getSOP(domain);

        cleaningLog.push(`[PROTOCOL] Applied ${domain.toUpperCase()} domain rules`);
        cleaningLog.push(`[SOP] ID: ${sop.id}`);

        const initialRowCount = rawData.rows.length;
        cleaningLog.push(`[DATA] Initial row count: ${initialRowCount}`);

        // Apply cleaning rules with logging
        const { cleanedRows, logs } = this.applyCleaningRulesWithLog(
            rawData.rows,
            sop.rules
        );
        cleaningLog.push(...logs);

        const removedRows = initialRowCount - cleanedRows.length;
        if (removedRows > 0) {
            cleaningLog.push(`[CLEAN] Removed ${removedRows} invalid/empty rows`);
        }

        // Analyze column types
        const { numericColumns, categoricalColumns, dateColumns } =
            this.analyzeColumnTypes(cleanedRows, rawData.headers);

        cleaningLog.push(`[NUMERIC] Found ${numericColumns.length} columns: [${numericColumns.slice(0, 5).join(', ')}${numericColumns.length > 5 ? '...' : ''}]`);
        cleaningLog.push(`[CATEGORY] Found ${categoricalColumns.length} columns: [${categoricalColumns.slice(0, 5).join(', ')}${categoricalColumns.length > 5 ? '...' : ''}]`);

        if (dateColumns.length > 0) {
            cleaningLog.push(`[DATE] Found ${dateColumns.length} date columns: [${dateColumns.join(', ')}]`);
        }

        // Standardize headers
        const standardizedHeaders = rawData.headers.map(h =>
            h.trim().replace(/\s+/g, '_').toLowerCase()
        );
        cleaningLog.push(`[FORMAT] Standardized headers to snake_case`);

        cleaningLog.push(`[DONE] Final dataset: ${cleanedRows.length} rows x ${rawData.headers.length} columns`);

        // Construct Types Record for Meta
        const types: Record<string, string> = {};
        numericColumns.forEach(c => types[c] = 'number');
        categoricalColumns.forEach(c => types[c] = 'string');
        dateColumns.forEach(c => types[c] = 'date');

        return {
            headers: standardizedHeaders,
            data: cleanedRows,
            meta: {
                rowCount: cleanedRows.length,
                colCount: rawData.headers.length,
                types: types,
                originalFileName: file.name
            },
            cleaningLog
        };
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private detectFileType(file: File): FileType {
        const extension = file.name.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'csv': return 'csv';
            case 'json': return 'json';
            case 'xlsx': return 'xlsx';
            case 'xls': return 'xls';
            default: return 'unknown';
        }
    }

    private async parseFile(file: File, fileType: FileType): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
        switch (fileType) {
            case 'csv': return this.parseCSV(file);
            case 'json': return this.parseJSON(file);
            case 'xlsx':
            case 'xls': return this.parseExcel(file);
            default: return this.parseCSV(file);
        }
    }

    private parseCSV(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results) => {
                    const headers = results.meta.fields || [];
                    const rows = results.data as Record<string, unknown>[];
                    resolve({ headers, rows });
                },
                error: (error) => {
                    reject(new Error(`CSV parsing failed: ${error.message}`));
                }
            });
        });
    }

    private async parseJSON(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
        const text = await file.text();
        const data = JSON.parse(text);

        if (Array.isArray(data) && data.length > 0) {
            const headers = Object.keys(data[0]);
            return { headers, rows: data };
        }

        const arrayProp = Object.values(data).find(v => Array.isArray(v));
        if (arrayProp && Array.isArray(arrayProp) && arrayProp.length > 0) {
            const headers = Object.keys(arrayProp[0]);
            return { headers, rows: arrayProp as Record<string, unknown>[] };
        }

        throw new Error('JSON structure not supported. Expected array of objects.');
    }

    private async parseExcel(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
            const row = rawRows[i] as unknown[];
            if (!row) continue;
            const nonEmptyCells = row.filter(cell =>
                cell !== null && cell !== undefined && String(cell).trim() !== ''
            ).length;
            if (nonEmptyCells >= 3) {
                headerRowIndex = i;
                break;
            }
        }

        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            range: headerRowIndex
        });

        if (jsonData.length === 0) return { headers: [], rows: [] };

        const allHeaders = Object.keys(jsonData[0]);
        const cleanHeaders = allHeaders.filter(h =>
            !h.includes('__EMPTY') && h.trim() !== '' && !h.startsWith('_')
        );

        const cleanRows = jsonData.map(row => {
            const cleanRow: Record<string, unknown> = {};
            for (const header of cleanHeaders) {
                if (row[header] !== undefined && row[header] !== null) {
                    cleanRow[header] = row[header];
                }
            }
            return cleanRow;
        });

        return { headers: cleanHeaders, rows: cleanRows };
    }

    private applyCleaningRulesWithLog(rows: Record<string, unknown>[], rules: string[]): { cleanedRows: Record<string, unknown>[]; logs: string[] } {
        const logs: string[] = [];
        let currencyConversions = 0;
        let percentConversions = 0;
        let nullsHandled = 0;
        let trimmedStrings = 0;

        const cleanedRows = rows.map(row => {
            const cleanedRow: Record<string, unknown> = {};
            for (const [key, value] of Object.entries(row)) {
                const result = this.cleanValueWithStats(value);
                cleanedRow[key] = result.value;

                if (result.wasCurrency) currencyConversions++;
                if (result.wasPercent) percentConversions++;
                if (result.wasNull) nullsHandled++;
                if (result.wasTrimmed) trimmedStrings++;
            }
            return cleanedRow;
        }).filter(row => {
            return Object.values(row).some(v => v !== null && v !== undefined && v !== '');
        });

        if (currencyConversions > 0) logs.push(`[CURRENCY] Converted ${currencyConversions} currency strings to numeric`);
        if (percentConversions > 0) logs.push(`[PERCENT] Converted ${percentConversions} percentage strings to decimal`);
        if (trimmedStrings > 0) logs.push(`[TRIM] Cleaned whitespace from ${trimmedStrings} text values`);
        if (nullsHandled > 0) logs.push(`[NULL] Handled ${nullsHandled} null/empty values`);

        logs.push(`[RULES] Applied ${rules.length} domain-specific cleaning rules`);

        return { cleanedRows, logs };
    }

    private cleanValueWithStats(value: unknown): { value: unknown; wasCurrency: boolean; wasPercent: boolean; wasNull: boolean; wasTrimmed: boolean; } {
        let wasCurrency = false;
        let wasPercent = false;
        let wasNull = false;
        let wasTrimmed = false;

        if (value === null || value === undefined) {
            wasNull = true;
            return { value: null, wasCurrency, wasPercent, wasNull, wasTrimmed };
        }

        if (typeof value === 'string') {
            let cleaned = value.trim();
            if (cleaned !== value) wasTrimmed = true;

            if (/^[$€£¥][\d,.-]+$/.test(cleaned)) {
                wasCurrency = true;
                cleaned = cleaned.replace(/[$€£¥,]/g, '');
                return { value: parseFloat(cleaned), wasCurrency, wasPercent, wasNull, wasTrimmed };
            }

            if (/^[\d.-]+%$/.test(cleaned)) {
                wasPercent = true;
                return { value: parseFloat(cleaned.replace('%', '')) / 100, wasCurrency, wasPercent, wasNull, wasTrimmed };
            }

            if (/^\([\d,.-]+\)$/.test(cleaned)) {
                wasCurrency = true;
                return { value: -parseFloat(cleaned.replace(/[(),]/g, '')), wasCurrency, wasPercent, wasNull, wasTrimmed };
            }

            if (cleaned === '' || cleaned.toLowerCase() === 'null' || cleaned.toLowerCase() === 'n/a') {
                wasNull = true;
                return { value: null, wasCurrency, wasPercent, wasNull, wasTrimmed };
            }
            return { value: cleaned, wasCurrency, wasPercent, wasNull, wasTrimmed };
        }
        return { value, wasCurrency, wasPercent, wasNull, wasTrimmed };
    }

    private analyzeColumnTypes(rows: Record<string, unknown>[], headers: string[]): { numericColumns: string[]; categoricalColumns: string[]; dateColumns: string[] } {
        const numericColumns: string[] = [];
        const categoricalColumns: string[] = [];
        const dateColumns: string[] = [];

        for (const header of headers) {
            const values = rows.map(row => row[header]).filter(v => v !== null && v !== undefined);
            if (values.length === 0) {
                categoricalColumns.push(header);
                continue;
            }
            const columnType = this.inferColumnType(values);
            switch (columnType) {
                case 'numeric': numericColumns.push(header); break;
                case 'date': dateColumns.push(header); break;
                default: categoricalColumns.push(header);
            }
        }
        return { numericColumns, categoricalColumns, dateColumns };
    }

    private inferColumnType(values: unknown[]): 'numeric' | 'date' | 'categorical' {
        const sample = values.slice(0, 100);
        const numericCount = sample.filter(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)))).length;
        if (numericCount / sample.length > 0.8) return 'numeric';

        const datePatterns = [/^\d{4}-\d{2}-\d{2}/, /^\d{2}\/\d{2}\/\d{4}/, /^\d{2}-\d{2}-\d{4}/];
        const dateCount = sample.filter(v => typeof v === 'string' && datePatterns.some(pattern => pattern.test(v))).length;
        if (dateCount / sample.length > 0.8) return 'date';

        return 'categorical';
    }
}

export const universalCleaner = new UniversalCleaner();
export default universalCleaner;
