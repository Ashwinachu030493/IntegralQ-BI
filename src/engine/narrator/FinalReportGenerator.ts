/**
 * FinalReportGenerator.ts - The Author
 * 
 * Generates professional Technical Data Analysis Reports following
 * academic structure with 5 sections:
 * 1. Introduction (Context & Dataset)
 * 2. Data Exploration (Features & Visualizations)
 * 3. Methodology (Pre-processing & Cleaning)
 * 4. Modelling & Results (Statistical Trends)
 * 5. Conclusion & Recommendations
 */

import type { ChartConfig, Domain, GeneratedReport, ReportContext, ReportSection } from '../../types';
import { llmBridge } from '../llm/LLMBridge';

/**
 * FinalReportGenerator - Creates academic-style technical reports
 */
export class FinalReportGenerator {
    /**
     * Generate a full Technical Data Analysis Report
     */
    async generate(
        selectedCharts: ChartConfig[],
        objective: string,
        domain: Domain,
        context?: ReportContext
    ): Promise<GeneratedReport> {
        console.log('[ReportGenerator] Generating technical report for', selectedCharts.length, 'charts');

        // Build sections based on context availability
        const sections: ReportSection[] = [];

        // Section 1: Introduction
        sections.push(this.buildIntroduction(domain, objective, context));

        // Section 2: Data Exploration
        sections.push(this.buildDataExploration(selectedCharts));

        // Section 3: Methodology
        if (context?.cleaningLogs && context.cleaningLogs.length > 0) {
            sections.push(this.buildMethodology(context.cleaningLogs));
        }

        // Section 4: Modelling & Results
        if (context?.stats?.models && context.stats.models.length > 0) {
            sections.push(this.buildModelling(context.stats));
        }

        // Section 5: Conclusion & Recommendations
        const recommendations = await this.generateRecommendations(selectedCharts, domain, context);
        sections.push(this.buildConclusion(selectedCharts, recommendations));

        // Generate BLUF summary using LLM
        const blufSummary = await this.generateBLUF(selectedCharts, domain, context);

        return {
            title: `Technical Data Analysis Report: ${this.formatDomainTitle(domain)} Domain`,
            sections,
            blufSummary,
            detailedFindings: this.extractFindings(sections),
            recommendations,
            generatedAt: new Date()
        };
    }

    /**
     * Build Introduction section
     */
    private buildIntroduction(domain: Domain, objective: string, context?: ReportContext): ReportSection {
        const sopSource = context?.sop?.source || 'Standard Data Analysis Practices';
        const rowCount = context?.stats?.rowCount || 'N/A';
        const columnCount = context?.stats?.columnCount || 'N/A';

        return {
            title: '1. Introduction',
            content: `
**Domain:** ${this.formatDomainTitle(domain)}

**Objective:** ${objective}

**Dataset Overview:**
- Total Records: ${rowCount}
- Total Features: ${columnCount}
- Analysis Protocol: ${sopSource}

This report presents a comprehensive analysis of the provided dataset following established ${domain} domain best practices. The analysis aims to uncover key patterns, trends, and actionable insights.
      `.trim()
        };
    }

    /**
     * Build Data Exploration section
     */
    private buildDataExploration(charts: ChartConfig[]): ReportSection {
        const chartDescriptions = charts.map((chart, i) =>
            `**${i + 1}. ${chart.title}** (${chart.type.toUpperCase()})\n   ${chart.description}`
        ).join('\n\n');

        return {
            title: '2. Data Exploration',
            content: `
The following visualizations were selected based on data suitability and domain best practices:

${chartDescriptions}

These visualizations collectively provide a multi-faceted view of the underlying data patterns and distributions.
      `.trim()
        };
    }

    /**
     * Build Methodology section
     */
    private buildMethodology(cleaningLogs: string[]): ReportSection {
        const formattedLogs = cleaningLogs.map(log => `- ${log}`).join('\n');

        return {
            title: '3. Methodology',
            content: `
**Data Pre-processing Steps:**

The dataset underwent the following cleaning and preparation procedures:

${formattedLogs}

These pre-processing steps ensure data quality and consistency for reliable analysis.
      `.trim()
        };
    }

    /**
     * Build Modelling & Results section
     */
    private buildModelling(stats: ReportContext['stats']): ReportSection {
        const modelResults = stats.models.map(model => `
**Model:** ${model.modelType}
- **Feature Relationship:** ${model.feature}
- **R² Score:** ${model.rSquared}
- **Correlation:** ${model.correlation}
- **Insight:** ${model.insight}
    `.trim()).join('\n\n');

        // Top correlations
        const topCorrelations = stats.correlations.slice(0, 3).map(c =>
            `- ${c.feature1} ↔ ${c.feature2}: **r = ${c.correlation}**`
        ).join('\n');

        return {
            title: '4. Modelling & Results',
            content: `
**Statistical Models Applied:**

${modelResults || 'No regression models were applicable to this dataset.'}

**Key Correlations Identified:**

${topCorrelations || 'No significant correlations detected.'}

The above models provide quantitative measures of relationships within the data, enabling predictive insights and trend identification.
      `.trim()
        };
    }

    /**
     * Build Conclusion section
     */
    private buildConclusion(charts: ChartConfig[], recommendations: string[]): ReportSection {
        const formattedRecs = recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n');

        return {
            title: '5. Conclusion & Recommendations',
            content: `
**Summary of Findings:**

Based on analysis of ${charts.length} visualizations and statistical models, the following key conclusions emerge:

- The data exhibits identifiable patterns suitable for ${charts.length > 0 ? charts[0].type : 'various'} analysis
- Statistical relationships have been quantified where applicable
- Actionable insights have been derived from the analysis

**Recommendations:**

${formattedRecs}

These recommendations are based on the analytical findings and domain best practices.
      `.trim()
        };
    }

    /**
     * Generate BLUF (Bottom Line Up Front) summary using LLM
     */
    private async generateBLUF(
        charts: ChartConfig[],
        domain: Domain,
        context?: ReportContext
    ): Promise<string> {
        // Build comprehensive prompt with actual data summaries
        const chartTitles = charts.map(c => c.title).join(', ');
        const cleaningSteps = context?.cleaningLogs?.length || 0;

        // Extract human-readable stats
        const numericSummaries = context?.stats?.numericSummary
            ? Object.entries(context.stats.numericSummary)
                .filter(([key]) => !key.toLowerCase().includes('id'))
                .slice(0, 3)
                .map(([key, stats]) => `${key}: Average ${Math.round(stats.mean)}, Peak ${Math.round(stats.max)}`)
                .join('; ')
            : '';

        const modelInsights = context?.stats?.models
            ?.filter(m => !m.feature.toLowerCase().includes('id'))
            .map(m => m.insight)
            .join(' ') || '';

        const prompt = `
YOU ARE: A Senior Strategy Consultant presenting to a Fortune 500 Board of Directors.
TONE: Authoritative, Insightful, Actionable. Zero fluff.

⛔ NEVER SAY: "Based on the data", "The analysis shows", "Here is the report", "Looking at the numbers"
✅ INSTEAD START WITH: A bold insight statement like "Employee retention is the strongest driver of..."

EXAMPLE BAD OUTPUT: "The data analysis reveals that there is a correlation between salary and tenure."
EXAMPLE GOOD OUTPUT: "Retaining employees beyond the 3-year mark delivers a 27% productivity boost, justifying targeted retention bonuses for high performers."

DATA CONTEXT:
- Domain: ${this.formatDomainTitle(domain)}
- Business Objective: ${context?.sop?.objective || 'Strategic data analysis'}
- Key Metrics: ${numericSummaries || 'Various metrics analyzed'}
- Visualizations: ${chartTitles}
- Data Quality: ${cleaningSteps} validation steps completed
- Key Findings: ${modelInsights || 'Patterns identified for decision support'}

INSTRUCTIONS:
Write exactly 2-3 sentences that:
1. Lead with the BUSINESS IMPACT (what should the CEO do?)
2. Quantify in plain language ("$72K average salary", not "mean = 72000")
3. End with a strategic recommendation

Output ONLY the executive summary. No headers, no preamble.
    `.trim();

        let summaryText = '';

        try {
            const response = await llmBridge.generate({
                systemPrompt: 'You are a senior strategy consultant translating data insights into business language.',
                userPrompt: prompt,
                temperature: 0.4
            });
            summaryText = response.text;
            console.log('[ReportGenerator] LLM Summary generated:', summaryText.substring(0, 100));
        } catch {
            console.warn('[ReportGenerator] LLM generation failed, using logic fallback');
        }

        // FALLBACK: If AI failed or returned generic template text, use logic-based summary
        const genericPatterns = [
            'The analysis reveals significant patterns',
            'Key metrics show measurable trends',
            'significant patterns were found',
            'patterns have been identified'
        ];

        const isGeneric = !summaryText ||
            summaryText.length < 50 ||
            genericPatterns.some(p => summaryText.toLowerCase().includes(p.toLowerCase()));

        if (isGeneric) {
            console.log('[ReportGenerator] Generic text detected, switching to logic-based summary');

            // Build a specific summary using actual data
            const rowCount = context?.stats?.rowCount || 0;
            const domainName = this.formatDomainTitle(domain);

            // Get top model insight if available
            const topModel = context?.stats?.models?.find(m => !m.feature.toLowerCase().includes('id'));
            const modelInsight = topModel
                ? `Analysis reveals a ${Math.abs(topModel.correlation) > 0.5 ? 'strong' : 'moderate'} relationship between ${topModel.feature.replace('<->', ' and ')} (correlation: ${topModel.correlation}).`
                : '';

            // Get forecast trend if available
            const forecastTrend = context?.forecast
                ? `Predictive modeling indicates a ${context.forecast.trend.toLowerCase()} trend for ${context.forecast.metric}.`
                : '';

            summaryText = `
**Data-Driven Insight:** This ${domainName} analysis covers ${rowCount} records processed under domain-specific protocols. ${numericSummaries ? `Key metrics: ${numericSummaries}.` : ''} ${modelInsight} ${forecastTrend}

*(Note: AI services were unavailable. This summary was generated using algorithmic logic.)*
            `.trim();
        }

        return summaryText;
    }

    /**
     * Generate recommendations using LLM
     */
    private async generateRecommendations(
        charts: ChartConfig[],
        domain: Domain,
        context?: ReportContext
    ): Promise<string[]> {
        // Filter out ID-related insights
        const meaningfulInsights = context?.stats?.models
            ?.filter(m => !m.feature.toLowerCase().includes('id'))
            .map(m => m.insight)
            .join('; ') || 'Various patterns detected';

        const prompt = `
YOU ARE: A McKinsey-level strategist presenting to a C-Suite executive.

⛔ NEVER SAY: "Consider", "You might want to", "It would be beneficial"
✅ INSTEAD SAY: "Implement", "Deploy", "Launch", "Restructure"

DOMAIN: ${this.formatDomainTitle(domain)}
BUSINESS OBJECTIVE: ${context?.sop?.objective || 'Improving organizational performance'}
KEY ANALYSES: ${charts.map(c => c.title).join(', ')}
INSIGHTS DISCOVERED: ${meaningfulInsights}

Generate exactly 3 BOLD, ACTION-ORIENTED recommendations.
Each must:
- Start with a strong action verb (Implement, Launch, Deploy, Restructure)
- Include a specific metric or target ("reduce by 15%", "within Q2")
- Be directly tied to the data insights

⛔ DO NOT recommend: "Gather more data", "Run further analysis", "Monitor trends"
✅ RECOMMEND: Specific business actions that drive ROI.

Format: Return ONLY 3 recommendations, one per line. DO NOT use bullets or numbers.
    `.trim();

        try {
            const response = await llmBridge.generate({
                systemPrompt: 'You are a business strategy consultant.',
                userPrompt: prompt,
                temperature: 0.4
            });

            const rawText = response.text;

            // 🛡️ SANITIZATION LOGIC: Cleaner than just split/slice
            const cleanRecs = rawText
                .split('\n')
                .map(line => line.trim())
                // Remove markdown bolding (**), headers (##), and numbering (1.)
                .map(line => line.replace(/\*\*|##|^\d+\.\s*|^[-*•]\s*/g, '').trim())
                // Filter: Must be substantial and NOT a header
                .filter(line => {
                    const lower = line.toLowerCase();
                    const isHeader = lower.includes('summary') || lower.includes('recommendation') || lower.includes('here are');
                    return line.length > 15 && !isHeader;
                })
                .slice(0, 3);

            return cleanRecs.length > 0 ? cleanRecs : [
                'Implement data-driven dashboard to monitor key metrics identified in this analysis',
                'Conduct deeper investigation into the highest-correlation relationships',
                'Establish regular reporting cadence to track trends over time'
            ];
        } catch {
            // Fallback recommendations
            return [
                'Implement data-driven dashboard to monitor key metrics identified in this analysis',
                'Conduct deeper investigation into the highest-correlation relationships',
                'Establish regular reporting cadence to track trends over time'
            ];
        }
    }

    /**
     * Extract findings from sections for legacy format
     */
    private extractFindings(sections: ReportSection[]): string[] {
        const findings: string[] = [];

        for (const section of sections) {
            // Extract bullet points from content
            const lines = section.content.split('\n');
            for (const line of lines) {
                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    findings.push(line.trim().substring(2));
                }
            }
        }

        return findings.slice(0, 10);
    }

    /**
     * Format domain name for display
     */
    private formatDomainTitle(domain: Domain): string {
        return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
}

// Singleton instance
export const finalReportGenerator = new FinalReportGenerator();

export default finalReportGenerator;
