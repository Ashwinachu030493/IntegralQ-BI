/**
 * SmartMerger.ts - Intelligent Multi-File Merger
 * 
 * Handles complex relational data scenarios:
 * - STACK: Vertical concatenation for similar files (>70% column match)
 * - JOIN: Horizontal merge for files sharing an ID key
 * - HYBRID: Stack first, then join (e.g., multiple employee files + office data)
 * 
 * Algorithm: "Stack First, Join Later"
 * 1. Sort files by row count to identify the main "Fact Table"
 * 2. Iterate through remaining files
 * 3. If similar columns → STACK (more rows of same data)
 * 4. If common ID key → JOIN (enriching with new columns)
 */

import type { CleanedData } from '../../types';

/**
 * Merge strategy result
 */
interface MergeResult {
    data: CleanedData;
    strategy: 'stack' | 'join' | 'hybrid' | 'single';
    mergeLog: string[];
}

/**
 * SmartMerger - Intelligently combines multiple datasets
 */
export class SmartMerger {
    /**
     * Merge multiple cleaned datasets using "Stack First, Join Later" algorithm
     */
    static merge(datasets: CleanedData[]): MergeResult {
        const mergeLog: string[] = [];

        // Single file - no merge needed
        if (datasets.length === 0) {
            throw new Error('No datasets to merge');
        }

        if (datasets.length === 1) {
            mergeLog.push('Single file detected - no merge required');
            return {
                data: datasets[0],
                strategy: 'single',
                mergeLog
            };
        }

        mergeLog.push(`Analyzing ${datasets.length} files for merge strategy...`);

        // Step 1: Sort by row count to identify the "Fact Table" (largest dataset)
        const sortedDatasets = [...datasets].sort((a, b) => b.rowCount - a.rowCount);

        let mainDataset = this.cloneDataset(sortedDatasets[0]);
        mergeLog.push(`Main dataset: ${mainDataset.metadata.originalFileName} (${mainDataset.rowCount} rows, ${mainDataset.headers.length} columns)`);

        let stackCount = 0;
        let joinCount = 0;

        // Step 2: Iterate through remaining files
        for (let i = 1; i < sortedDatasets.length; i++) {
            const currentDataset = sortedDatasets[i];
            const currentName = currentDataset.metadata.originalFileName || `File ${i + 1}`;

            mergeLog.push(`Processing: ${currentName} (${currentDataset.rowCount} rows)`);

            // A. CHECK FOR STACK (Similarity > 70%)
            const similarity = this.calculateSimilarity(mainDataset.headers, currentDataset.headers);
            mergeLog.push(`  Column similarity: ${(similarity * 100).toFixed(1)}%`);

            if (similarity > 0.7) {
                mergeLog.push(`  -> STACKING: Similar column structure detected`);
                mainDataset = this.performStack(mainDataset, currentDataset);
                stackCount++;
                continue;
            }

            // B. CHECK FOR JOIN (Common ID key)
            const commonKey = this.findCommonKey(mainDataset.headers, currentDataset.headers);

            if (commonKey) {
                mergeLog.push(`  -> JOINING: Found common key '${commonKey}'`);
                mainDataset = this.performJoin(mainDataset, currentDataset, commonKey);
                joinCount++;
            } else {
                mergeLog.push(`  -> ORPHAN: No relation detected, skipping`);
            }
        }

        // Determine final strategy
        let strategy: 'stack' | 'join' | 'hybrid' | 'single' = 'single';
        if (stackCount > 0 && joinCount > 0) {
            strategy = 'hybrid';
        } else if (stackCount > 0) {
            strategy = 'stack';
        } else if (joinCount > 0) {
            strategy = 'join';
        }

        mergeLog.push(`---`);
        mergeLog.push(`Merge complete: Strategy=${strategy.toUpperCase()}`);
        mergeLog.push(`Result: ${mainDataset.rowCount} rows x ${mainDataset.headers.length} columns`);

        return {
            data: mainDataset,
            strategy,
            mergeLog
        };
    }

    /**
     * Clone a dataset to avoid mutation
     */
    private static cloneDataset(dataset: CleanedData): CleanedData {
        return {
            ...dataset,
            headers: [...dataset.headers],
            rows: dataset.rows.map(row => ({ ...row })),
            numericColumns: [...dataset.numericColumns],
            categoricalColumns: [...dataset.categoricalColumns],
            dateColumns: [...dataset.dateColumns],
            cleaningLog: [...dataset.cleaningLog],
            metadata: { ...dataset.metadata }
        };
    }

    /**
     * Calculate column similarity between two header sets
     */
    private static calculateSimilarity(headers1: string[], headers2: string[]): number {
        const set1 = new Set(headers1.map(h => h.toLowerCase().trim()));
        const set2 = new Set(headers2.map(h => h.toLowerCase().trim()));

        let intersection = 0;
        set1.forEach(h => {
            if (set2.has(h)) intersection++;
        });

        return intersection / Math.max(set1.size, set2.size);
    }

    /**
     * Find a common ID key between two header sets
     */
    private static findCommonKey(headers1: string[], headers2: string[]): string | null {
        const idPatterns = ['_id', 'id', 'code', 'key', 'number', 'num', 'no'];

        const lowerHeaders1 = headers1.map(h => h.toLowerCase().trim());
        const lowerHeaders2 = headers2.map(h => h.toLowerCase().trim());

        // Find columns that exist in both and look like IDs
        for (let i = 0; i < lowerHeaders1.length; i++) {
            const h1 = lowerHeaders1[i];
            if (lowerHeaders2.includes(h1)) {
                // Check if it matches ID patterns
                if (idPatterns.some(pattern => h1.includes(pattern))) {
                    return headers1[i]; // Return original case
                }
            }
        }

        // Also check for common relational keys
        const commonRelationalKeys = [
            'customer_id', 'customerid', 'cust_id', 'custid',
            'user_id', 'userid', 'employee_id', 'employeeid', 'emp_id', 'empid',
            'department_id', 'departmentid', 'dept_id', 'deptid',
            'product_id', 'productid', 'prod_id', 'prodid',
            'order_id', 'orderid', 'transaction_id', 'transactionid',
            'account_id', 'accountid', 'office_id', 'officeid',
            'location_id', 'locationid', 'branch_id', 'branchid'
        ];

        for (const key of commonRelationalKeys) {
            const matchIndex1 = lowerHeaders1.indexOf(key);
            const matchIndex2 = lowerHeaders2.indexOf(key);
            if (matchIndex1 !== -1 && matchIndex2 !== -1) {
                return headers1[matchIndex1]; // Return original case
            }
        }

        return null;
    }

    /**
     * Stack datasets vertically (concatenation)
     */
    private static performStack(main: CleanedData, additional: CleanedData): CleanedData {
        // Combine rows
        const allRows = [...main.rows, ...additional.rows];

        // Combine cleaning logs
        const combinedLog = [
            ...main.cleaningLog,
            `Stacked ${additional.rowCount} rows from ${additional.metadata.originalFileName || 'additional file'}`
        ];

        return {
            ...main,
            rows: allRows,
            rowCount: allRows.length,
            cleaningLog: combinedLog,
            metadata: {
                ...main.metadata,
                mergeStrategy: 'stack',
                filesCount: (main.metadata.filesCount || 1) + 1
            }
        };
    }

    /**
     * Join datasets horizontally (left join on key)
     */
    private static performJoin(left: CleanedData, right: CleanedData, key: string): CleanedData {
        // Create lookup map for right dataset (Hash Join - O(n) performance)
        const rightMap = new Map<string, Record<string, unknown>>();

        for (const row of right.rows) {
            const keyValue = String(row[key] ?? '').toLowerCase().trim();
            if (keyValue) {
                rightMap.set(keyValue, row);
            }
        }

        // Perform left join
        let matchCount = 0;
        const joinedRows = left.rows.map(leftRow => {
            const keyValue = String(leftRow[key] ?? '').toLowerCase().trim();
            const rightRow = rightMap.get(keyValue);

            if (rightRow) {
                matchCount++;
                // Merge: right values fill in, left values take precedence
                return { ...rightRow, ...leftRow };
            }

            return leftRow;
        });

        // Merge headers (unique, preserving order)
        const allHeaders = [...left.headers];
        for (const header of right.headers) {
            if (!allHeaders.some(h => h.toLowerCase() === header.toLowerCase())) {
                allHeaders.push(header);
            }
        }

        // Merge column classifications
        const numericColumns = [...new Set([...left.numericColumns, ...right.numericColumns])];
        const categoricalColumns = [...new Set([...left.categoricalColumns, ...right.categoricalColumns])];
        const dateColumns = [...new Set([...left.dateColumns, ...right.dateColumns])];

        // Combined log
        const matchRate = left.rowCount > 0 ? matchCount / left.rowCount : 0;
        const combinedLog = [
            ...left.cleaningLog,
            `Joined with ${right.metadata.originalFileName || 'additional file'} on key: ${key}`,
            `Match rate: ${matchCount}/${left.rowCount} rows (${(matchRate * 100).toFixed(1)}%)`
        ];

        return {
            headers: allHeaders,
            rows: joinedRows,
            numericColumns,
            categoricalColumns,
            dateColumns,
            rowCount: joinedRows.length,
            columnCount: allHeaders.length,
            cleaningLog: combinedLog,
            metadata: {
                ...left.metadata,
                mergeStrategy: 'join',
                joinKey: key,
                matchRate
            }
        };
    }
}

// Export singleton-style
export const smartMerger = SmartMerger;

export default SmartMerger;
