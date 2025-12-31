/**
 * SmartMerger.ts - Intelligent Multi-File Merger
 */

import type { CleanedData } from '../../types';

interface MergeResult {
    data: CleanedData;
    strategy: 'stack' | 'join' | 'hybrid' | 'single';
    mergeLog: string[];
}

export class SmartMerger {
    static merge(datasets: CleanedData[]): MergeResult {
        const log: string[] = [];
        if (datasets.length === 0) throw new Error("No datasets");
        if (datasets.length === 1) return { data: datasets[0], strategy: 'single', mergeLog: ['Single file'] };

        // Sort by row count
        const sorted = [...datasets].sort((a, b) => b.meta.rowCount - a.meta.rowCount);
        let main = sorted[0];
        let strategy: 'stack' | 'join' | 'hybrid' | 'single' = 'single';
        let stackCount = 0;
        let joinCount = 0;

        for (let i = 1; i < sorted.length; i++) {
            const other = sorted[i];
            const similarity = this.calcSimilarity(main.headers, other.headers);

            if (similarity > 0.7) {
                main = this.stack(main, other);
                stackCount++;
                log.push(`Stacked ${other.meta.originalFileName}`);
            } else {
                const key = this.findKey(main.headers, other.headers);
                if (key) {
                    main = this.join(main, other, key);
                    joinCount++;
                    log.push(`Joined ${other.meta.originalFileName} on ${key}`);
                } else {
                    log.push(`Skipped ${other.meta.originalFileName} (No relation)`);
                }
            }
        }

        if (stackCount > 0 && joinCount > 0) strategy = 'hybrid';
        else if (stackCount > 0) strategy = 'stack';
        else if (joinCount > 0) strategy = 'join';

        return { data: main, strategy, mergeLog: log };
    }

    private static calcSimilarity(h1: string[], h2: string[]): number {
        const s1 = new Set(h1.map(h => h.toLowerCase()));
        const s2 = new Set(h2.map(h => h.toLowerCase()));
        let match = 0;
        s1.forEach(h => { if (s2.has(h)) match++; });
        return match / Math.max(s1.size, s2.size);
    }

    private static findKey(h1: string[], h2: string[]): string | null {
        // Look for ID columns in both
        const s1 = new Set(h1.map(h => h.toLowerCase()));
        const common = h2.filter(h => s1.has(h.toLowerCase()));
        return common.find(c => /id|key|code/i.test(c)) || common[0] || null;
    }

    private static stack(d1: CleanedData, d2: CleanedData): CleanedData {
        const combinedMeta = { ...d1.meta, rowCount: d1.meta.rowCount + d2.meta.rowCount };
        // Merge types (union)
        for (const k in d2.meta.types) {
            if (!combinedMeta.types[k]) combinedMeta.types[k] = d2.meta.types[k];
        }

        return {
            headers: d1.headers,
            data: [...d1.data, ...d2.data],
            meta: combinedMeta,
            cleaningLog: [...(d1.cleaningLog || []), ...(d2.cleaningLog || [])]
        };
    }

    private static join(d1: CleanedData, d2: CleanedData, key: string): CleanedData {
        // Hash join
        const d2Map = new Map();
        d2.data.forEach(r => d2Map.set(String(r[key]), r));

        const joinedData = d1.data.map(r => {
            const match = d2Map.get(String(r[key]));
            return match ? { ...r, ...match } : r;
        });

        // Merge headers
        const newHeaders = [...d1.headers, ...d2.headers.filter(h => !d1.headers.includes(h))];
        const combinedMeta = { ...d1.meta, types: { ...d1.meta.types, ...d2.meta.types } };

        return {
            headers: newHeaders,
            data: joinedData,
            meta: combinedMeta, // Preserve row count of left table
            cleaningLog: [...(d1.cleaningLog || []), ...(d2.cleaningLog || [])]
        };
    }
}

export const smartMerger = SmartMerger;
export default SmartMerger;
