/**
 * ChartFactory.ts - Chart Generation Engine
 */

import type { ChartConfig, CleanedData, Domain } from '../../types';

export class ChartFactory {
    private idCounter = 0;

    private formatTitle(title: string): string {
        return title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }

    private getColumnTypes(data: CleanedData) {
        const numericColumns = Object.keys(data.meta.types).filter(k => data.meta.types[k] === 'number');
        const dateColumns = Object.keys(data.meta.types).filter(k => data.meta.types[k] === 'date');
        const categoricalColumns = Object.keys(data.meta.types).filter(k => data.meta.types[k] === 'string' || data.meta.types[k] === 'boolean');
        return { numericColumns, dateColumns, categoricalColumns };
    }

    generate(data: CleanedData, _domain: Domain): ChartConfig[] {
        const charts: ChartConfig[] = [];
        const { numericColumns, dateColumns, categoricalColumns } = this.getColumnTypes(data);
        const rows = data.data;

        let meaningfulNumeric = numericColumns.filter(col => !/id|code|key/i.test(col));
        if (meaningfulNumeric.length === 0) meaningfulNumeric = numericColumns;

        const ctx = { rows, numericColumns: meaningfulNumeric, dateColumns, categoricalColumns };

        if (ctx.numericColumns.length > 0) {
            if (ctx.categoricalColumns.length > 0) {
                this.addChart(charts, this.createBarChart(ctx));
                this.addChart(charts, this.createPieChart(ctx));
            }
            if (ctx.dateColumns.length > 0 || ctx.numericColumns.length >= 2) {
                this.addChart(charts, this.createLineChart(ctx));
            }
            if (ctx.numericColumns.length >= 2) {
                this.addChart(charts, this.createScatterChart(ctx));
            }
        }
        return charts;
    }

    private addChart(charts: ChartConfig[], chart: ChartConfig | null) {
        if (chart && chart.data && chart.data.length > 0) {
            charts.push(chart);
        }
    }

    private createId(): string {
        return `chart-${++this.idCounter}-${Date.now()}`;
    }

    private createBarChart(ctx: any): ChartConfig | null {
        const cat = ctx.categoricalColumns[0];
        const num = ctx.numericColumns[0];
        if (!cat || !num) return null;

        const data = this.aggregate(ctx.rows, cat, num);

        return {
            id: this.createId(),
            type: 'bar',
            title: this.formatTitle(`${num} by ${cat}`),
            description: `Distribution of ${num} across ${cat}`,
            data: data,
            xKey: cat,
            yKey: num, // Changed from yKeys
            score: 10
        };
    }

    private createPieChart(ctx: any): ChartConfig | null {
        const cat = ctx.categoricalColumns[0];
        const num = ctx.numericColumns[0];
        if (!cat || !num) return null;

        const data = this.aggregate(ctx.rows, cat, num).slice(0, 10);

        return {
            id: this.createId(),
            type: 'pie',
            title: this.formatTitle(`${num} Share`),
            description: `Proportional share of ${num}`,
            data: data,
            xKey: cat,
            yKey: num, // Changed from yKeys
            score: 8
        };
    }

    private createLineChart(ctx: any): ChartConfig | null {
        const x = ctx.dateColumns[0] || ctx.categoricalColumns[0];
        const y = ctx.numericColumns[0];
        if (!x || !y) return null;

        return {
            id: this.createId(),
            type: 'line',
            title: this.formatTitle(`${y} Trend`),
            description: `Trend of ${y} over ${x}`,
            data: ctx.rows.slice(0, 100),
            xKey: x,
            yKey: y, // Changed from yKeys
            score: 9
        };
    }

    private createScatterChart(ctx: any): ChartConfig | null {
        const x = ctx.numericColumns[0];
        const y = ctx.numericColumns[1];
        if (!x || !y) return null;

        return {
            id: this.createId(),
            type: 'scatter',
            title: this.formatTitle(`${x} vs ${y}`),
            description: `Correlation between ${x} and ${y}`,
            data: ctx.rows.slice(0, 200),
            xKey: x,
            yKey: y, // Changed from yKeys
            score: 9
        };
    }

    private aggregate(rows: any[], cat: string, num: string): any[] {
        const map = new Map<string, number>();
        for (const row of rows) {
            const k = String(row[cat] || 'Unknown');
            const v = Number(row[num]) || 0;
            map.set(k, (map.get(k) || 0) + v);
        }
        return Array.from(map.entries()).map(([k, v]) => ({ [cat]: k, [num]: v }))
            .sort((a, b) => (b[num] as number) - (a[num] as number));
    }
}

export const chartFactory = new ChartFactory();
export default chartFactory;
