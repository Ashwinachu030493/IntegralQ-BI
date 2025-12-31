/**
 * FinalReportGenerator.ts - The Author
 */

import type { ChartConfig, Domain, GeneratedReport, PipelineResult, ReportSection } from '../../types';

export class FinalReportGenerator {
    async generate(
        selectedCharts: ChartConfig[],
        objective: string,
        domain: Domain,
        data: PipelineResult
    ): Promise<GeneratedReport> {
        console.log('[ReportGenerator] Generating technical report');

        const sections: ReportSection[] = [];

        // 1. Introduction
        sections.push(this.buildIntroduction(domain, objective, data));

        // 2. Data Exploration
        sections.push(this.buildDataExploration(selectedCharts));

        // 3. Methodology
        if (data.cleaningLogs && data.cleaningLogs.length > 0) {
            sections.push(this.buildMethodology(data.cleaningLogs));
        }

        // 4. Modelling
        if (data.stats && data.stats.models && data.stats.models.length > 0) {
            sections.push(this.buildModelling(data.stats));
        }

        // 5. Conclusion
        const recommendations = await this.generateRecommendations(selectedCharts, domain, data);
        sections.push(this.buildConclusion(selectedCharts, recommendations));

        // Summary
        const blufSummary = await this.generateBLUF(selectedCharts, domain, data);

        return {
            id: `rep-${Date.now()}`,
            title: `Technical Data Analysis Report: ${domain} Domain`,
            sections,
            summary: blufSummary,
            generatedAt: new Date()
        };
    }

    private buildIntroduction(domain: Domain, objective: string, data: PipelineResult): ReportSection {
        return {
            title: '1. Introduction',
            content: `
**Domain:** ${domain}
**Objective:** ${objective}

**Dataset Overview:**
- Total Records: ${data.rowCount}
- Analysis Protocol: ${data.sop?.id || 'Standard'}

This report presents a comprehensive analysis aimed at uncovering key patterns and actionable insights.
            `.trim()
        };
    }

    private buildDataExploration(charts: ChartConfig[]): ReportSection {
        const descriptions = charts.map((c, i) => `**${i + 1}. ${c.title}** (${c.type})`).join('\n');
        return {
            title: '2. Data Exploration',
            content: `Selected Visualizations:\n\n${descriptions}\n\nThese views provide insight into underlying data distributions.`
        };
    }

    private buildMethodology(logs: string[]): ReportSection {
        return {
            title: '3. Methodology',
            content: `**Data Pre-processing:**\n\n${logs.map(l => `- ${l}`).join('\n')}`
        };
    }

    private buildModelling(stats: any): ReportSection {
        const models = stats.models || [];
        const modelText = models.map((m: any) => `**${m.modelName}**: Accuracy ${m.accuracy}. ${m.details || ''}`).join('\n\n');
        return {
            title: '4. Modelling & Results',
            content: `**Statistical Models Applied:**\n\n${modelText}`
        };
    }

    private buildConclusion(charts: ChartConfig[], recommendations: string[]): ReportSection {
        return {
            title: '5. Conclusion & Recommendations',
            content: `**Key Findings:**\n- Data patterns identified in ${charts.length} charts.\n\n**Recommendations:**\n${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        };
    }

    private async generateBLUF(_charts: ChartConfig[], domain: Domain, data: PipelineResult): Promise<string> {
        return data.ai_narrative?.summary[0] || `Analysis of ${data.rowCount} rows in ${domain} domain completed.`;
    }

    private async generateRecommendations(_charts: ChartConfig[], _domain: Domain, _data: PipelineResult): Promise<string[]> {
        return [
            "Implement continuous monitoring of identified metrics.",
            "Investigate outliers highlighted in the analysis.",
            "Optimize operational parameters based on correlation findings."
        ];
    }
}

export const finalReportGenerator = new FinalReportGenerator();
export default finalReportGenerator;
