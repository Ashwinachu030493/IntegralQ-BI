/**
 * PDFGenerator.ts - Visual PDF Report Generator
 * 
 * Generates professional PDF reports with:
 * - Cover page with branding
 * - Embedded chart screenshots
 * - 5-section academic structure
 * - Formatted methodology and modelling sections
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { GeneratedReport, PipelineResult, ChartConfig } from '../../types';

// PDF Configuration
const PDF_CONFIG = {
    pageWidth: 210,  // A4 width in mm
    pageHeight: 297, // A4 height in mm
    margin: 20,
    contentWidth: 170, // 210 - 40 (margins)
    lineHeight: 7,
    fontSize: {
        title: 24,
        subtitle: 14,
        heading: 16,
        subheading: 12,
        body: 10,
        small: 8
    },
    colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        text: '#1f2937',
        muted: '#6b7280',
        accent: '#22c55e'
    }
};

/**
 * PDFGenerator - Creates professional PDF reports
 */
export class PDFGenerator {
    private pdf: jsPDF;
    private yPosition: number;
    private pageNumber: number;

    constructor() {
        this.pdf = new jsPDF('p', 'mm', 'a4');
        this.yPosition = PDF_CONFIG.margin;
        this.pageNumber = 1;
    }

    /**
     * Generate complete PDF report
     */
    async generate(
        report: GeneratedReport,
        pipelineResult: PipelineResult,
        selectedCharts: ChartConfig[],
        chartContainerElement?: HTMLElement | null
    ): Promise<Blob> {
        this.pdf = new jsPDF('p', 'mm', 'a4');
        this.yPosition = PDF_CONFIG.margin;
        this.pageNumber = 1;

        // Page 1: Cover Page
        await this.renderCoverPage(report, pipelineResult);

        // Page 2-3: Data Exploration with Charts
        this.addNewPage();
        await this.renderDataExploration(selectedCharts, chartContainerElement);

        // Page 4: Methodology
        this.addNewPage();
        this.renderMethodology(pipelineResult.cleaningLogs);

        // Page 5: Modelling & Results
        this.addNewPage();
        this.renderModelling(pipelineResult.stats);

        // Page 6: Conclusion & Recommendations
        this.addNewPage();
        this.renderConclusion(report);

        // Add page numbers
        this.addPageNumbers();

        return this.pdf.output('blob');
    }

    /**
     * Render Cover Page
     */
    private async renderCoverPage(report: GeneratedReport, result: PipelineResult): Promise<void> {
        const { pageWidth, pageHeight, margin, fontSize } = PDF_CONFIG;

        // Background gradient effect (simulated with rectangles)
        this.pdf.setFillColor(15, 23, 42); // Dark blue
        this.pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Accent bar at top
        this.pdf.setFillColor(99, 102, 241); // Primary purple
        this.pdf.rect(0, 0, pageWidth, 8, 'F');

        // Logo/Icon area - Use ASCII-safe symbol
        this.pdf.setFontSize(32);
        this.pdf.setTextColor(255, 255, 255);
        this.pdf.text('[DATA ANALYSIS]', pageWidth / 2, 60, { align: 'center' });

        // Main Title
        this.pdf.setFontSize(fontSize.title);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(255, 255, 255);
        const title = 'Technical Data Analysis Report';
        this.pdf.text(title, pageWidth / 2, 85, { align: 'center' });

        // Domain Badge
        this.pdf.setFillColor(99, 102, 241);
        const domainText = result.domain.toUpperCase();
        const badgeWidth = this.pdf.getTextWidth(domainText) + 20;
        this.pdf.roundedRect((pageWidth - badgeWidth) / 2, 95, badgeWidth, 12, 3, 3, 'F');
        this.pdf.setFontSize(fontSize.subheading);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(domainText, pageWidth / 2, 103, { align: 'center' });

        // Subtitle
        this.pdf.setFontSize(fontSize.subtitle);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(148, 163, 184);
        this.pdf.text('Process-Aware Data Science Platform', pageWidth / 2, 120, { align: 'center' });

        // Divider line
        this.pdf.setDrawColor(71, 85, 105);
        this.pdf.line(margin, 135, pageWidth - margin, 135);

        // Executive Summary (BLUF)
        this.pdf.setFontSize(fontSize.subheading);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(139, 92, 246);
        this.pdf.text('EXECUTIVE SUMMARY', margin, 150);

        this.pdf.setFontSize(fontSize.body);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(226, 232, 240);
        const blufLines = this.pdf.splitTextToSize(report.blufSummary, PDF_CONFIG.contentWidth);
        this.pdf.text(blufLines, margin, 162);

        // Stats Grid
        const statsY = 200;
        this.pdf.setFontSize(fontSize.subheading);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(139, 92, 246);
        this.pdf.text('DATASET OVERVIEW', margin, statsY);

        this.pdf.setFontSize(fontSize.body);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(226, 232, 240);

        const stats = [
            { label: 'Total Records', value: result.data.rowCount.toString() },
            { label: 'Total Features', value: result.data.columnCount.toString() },
            { label: 'Charts Generated', value: result.charts.length.toString() },
            { label: 'Models Applied', value: result.stats.models.length.toString() }
        ];

        stats.forEach((stat, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = margin + col * 85;
            const y = statsY + 15 + row * 25;

            this.pdf.setFontSize(20);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(99, 102, 241);
            this.pdf.text(stat.value, x, y);

            this.pdf.setFontSize(fontSize.small);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(148, 163, 184);
            this.pdf.text(stat.label, x, y + 7);
        });

        // Footer
        this.pdf.setFontSize(fontSize.small);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(100, 116, 139);
        const dateStr = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        this.pdf.text(`Generated: ${dateStr}`, margin, pageHeight - 20);
        this.pdf.text('A-Z Self-Learning Platform', pageWidth - margin, pageHeight - 20, { align: 'right' });
    }

    /**
     * Render Data Exploration with Chart Screenshots
     */
    private async renderDataExploration(
        charts: ChartConfig[],
        containerElement?: HTMLElement | null
    ): Promise<void> {
        const { margin, contentWidth, fontSize } = PDF_CONFIG;

        // Section Header
        this.renderSectionHeader('2. Data Exploration');

        this.pdf.setFontSize(fontSize.body);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(31, 41, 55);
        this.pdf.text(
            'The following visualizations were selected based on data suitability and domain best practices:',
            margin,
            this.yPosition
        );
        this.yPosition += 15;

        // Try to capture chart screenshots
        if (containerElement) {
            try {
                const canvas = await html2canvas(containerElement, {
                    backgroundColor: '#0f172a',
                    scale: 2,
                    logging: false,
                    useCORS: true
                });

                const imgData = canvas.toDataURL('image/png');
                const imgWidth = contentWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                // Check if fits on page
                if (this.yPosition + imgHeight > PDF_CONFIG.pageHeight - margin) {
                    this.addNewPage();
                    this.yPosition = margin + 20;
                }

                this.pdf.addImage(imgData, 'PNG', margin, this.yPosition, imgWidth, Math.min(imgHeight, 200));
                this.yPosition += Math.min(imgHeight, 200) + 10;
            } catch (error) {
                console.warn('[PDFGenerator] Chart capture failed:', error);
                this.renderChartDescriptions(charts);
            }
        } else {
            this.renderChartDescriptions(charts);
        }
    }

    /**
     * Render chart descriptions in a 2-COLUMN GRID LAYOUT
     */
    private renderChartDescriptions(charts: ChartConfig[]): void {
        const { margin, fontSize } = PDF_CONFIG;

        // Grid Configuration
        const startY = this.yPosition;
        const chartWidth = 80;     // Width of each chart card
        const chartHeight = 55;    // Height of each chart card
        const gapX = 10;           // Horizontal gap
        const gapY = 10;           // Vertical gap
        const maxRowsPerPage = 3;  // Max rows before page break

        charts.forEach((chart, index) => {
            // 🧮 GRID CALCULATOR
            const col = index % 2;              // 0 = LEFT, 1 = RIGHT
            const row = Math.floor(index / 2);  // Increments every 2 charts

            // Calculate positions
            const xPos = margin + (col * (chartWidth + gapX));
            const yPos = startY + (row * (chartHeight + gapY));

            // Page break check (after 3 rows = 6 charts)
            if (row >= maxRowsPerPage && col === 0) {
                this.addNewPage();
                this.yPosition = PDF_CONFIG.margin + 20;
                // Recursively render remaining charts on new page
                this.renderChartDescriptions(charts.slice(index));
                return;
            }

            // --- CHART CARD ---

            // Card background
            this.pdf.setFillColor(249, 250, 251);
            this.pdf.roundedRect(xPos, yPos, chartWidth, chartHeight, 3, 3, 'F');

            // Card border
            this.pdf.setDrawColor(229, 231, 235);
            this.pdf.roundedRect(xPos, yPos, chartWidth, chartHeight, 3, 3, 'S');

            // Chart title (with truncation)
            this.pdf.setFontSize(fontSize.small);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(99, 102, 241);
            const truncatedTitle = chart.title.length > 25
                ? chart.title.substring(0, 22) + '...'
                : chart.title;
            this.pdf.text(truncatedTitle, xPos + 4, yPos + 8);

            // Chart type badge
            this.pdf.setFontSize(7);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setFillColor(99, 102, 241);
            const badgeText = chart.type.toUpperCase();
            const badgeWidth = this.pdf.getTextWidth(badgeText) + 6;
            this.pdf.roundedRect(xPos + 4, yPos + 11, badgeWidth, 5, 1, 1, 'F');
            this.pdf.setTextColor(255, 255, 255);
            this.pdf.text(badgeText, xPos + 7, yPos + 14.5);

            // Score badge
            this.pdf.setFillColor(34, 197, 94);
            const scoreText = `${chart.score} pts`;
            const scoreWidth = this.pdf.getTextWidth(scoreText) + 6;
            this.pdf.roundedRect(xPos + chartWidth - scoreWidth - 4, yPos + 11, scoreWidth, 5, 1, 1, 'F');
            this.pdf.setTextColor(255, 255, 255);
            this.pdf.text(scoreText, xPos + chartWidth - scoreWidth - 1, yPos + 14.5);

            // Chart description (wrapped)
            this.pdf.setFontSize(fontSize.small);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(75, 85, 99);
            const descLines = this.pdf.splitTextToSize(chart.description, chartWidth - 8);
            // Limit to 4 lines
            this.pdf.text(descLines.slice(0, 4), xPos + 4, yPos + 24);

            // Update yPosition for next section
            this.yPosition = Math.max(this.yPosition, yPos + chartHeight + gapY);
        });
    }

    /**
     * Render Methodology Section
     */
    private renderMethodology(cleaningLogs: string[]): void {
        const { margin, contentWidth, fontSize } = PDF_CONFIG;

        this.renderSectionHeader('3. Methodology');

        this.pdf.setFontSize(fontSize.body);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(31, 41, 55);
        this.pdf.text(
            'The dataset underwent the following pre-processing and cleaning procedures:',
            margin,
            this.yPosition
        );
        this.yPosition += 15;

        // Render each log entry
        cleaningLogs.forEach(log => {
            if (this.yPosition > PDF_CONFIG.pageHeight - 30) {
                this.addNewPage();
            }

            // Remove emoji for PDF (replace with bullet)
            const cleanLog = log.replace(/^[^\w\s]+\s*/, '- ');

            this.pdf.setFontSize(fontSize.body);
            this.pdf.setTextColor(55, 65, 81);
            const logLines = this.pdf.splitTextToSize(cleanLog, contentWidth - 10);
            this.pdf.text(logLines, margin + 5, this.yPosition);
            this.yPosition += logLines.length * 5 + 3;
        });

        this.yPosition += 10;

        // Summary box
        this.pdf.setFillColor(243, 244, 246);
        this.pdf.roundedRect(margin, this.yPosition, contentWidth, 25, 3, 3, 'F');
        this.pdf.setFontSize(fontSize.small);
        this.pdf.setFont('helvetica', 'italic');
        this.pdf.setTextColor(107, 114, 128);
        this.pdf.text(
            'These pre-processing steps ensure data quality and consistency for reliable analysis.',
            margin + 5,
            this.yPosition + 10
        );
    }

    /**
     * Render Modelling & Results Section
     */
    private renderModelling(stats: PipelineResult['stats']): void {
        const { margin, contentWidth, fontSize } = PDF_CONFIG;

        this.renderSectionHeader('4. Modelling & Results');

        if (!stats.models || stats.models.length === 0) {
            this.pdf.setFontSize(fontSize.body);
            this.pdf.setTextColor(107, 114, 128);
            this.pdf.text('No statistical models were applicable to this dataset.', margin, this.yPosition);
            return;
        }

        // Models Table Header
        this.pdf.setFillColor(99, 102, 241);
        this.pdf.rect(margin, this.yPosition, contentWidth, 10, 'F');
        this.pdf.setFontSize(fontSize.small);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(255, 255, 255);
        this.pdf.text('Feature Relationship', margin + 5, this.yPosition + 7);
        this.pdf.text('R² Score', margin + 100, this.yPosition + 7);
        this.pdf.text('Correlation', margin + 130, this.yPosition + 7);
        this.yPosition += 12;

        // Model rows
        stats.models.forEach((model, i) => {
            if (this.yPosition > PDF_CONFIG.pageHeight - 40) {
                this.addNewPage();
            }

            const bgColor = i % 2 === 0 ? [249, 250, 251] : [255, 255, 255];
            this.pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
            this.pdf.rect(margin, this.yPosition - 4, contentWidth, 12, 'F');

            this.pdf.setFontSize(fontSize.small);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(31, 41, 55);
            this.pdf.text(model.feature.substring(0, 40), margin + 5, this.yPosition + 3);

            // R² score with color coding
            const rSquared = model.rSquared;
            if (rSquared >= 0.7) {
                this.pdf.setTextColor(34, 197, 94); // Green
            } else if (rSquared >= 0.4) {
                this.pdf.setTextColor(234, 179, 8); // Yellow
            } else {
                this.pdf.setTextColor(239, 68, 68); // Red
            }
            this.pdf.text(rSquared.toFixed(2), margin + 105, this.yPosition + 3);

            this.pdf.setTextColor(31, 41, 55);
            this.pdf.text(model.correlation.toFixed(2), margin + 135, this.yPosition + 3);

            this.yPosition += 12;
        });

        this.yPosition += 10;

        // Key Insights
        this.pdf.setFontSize(fontSize.subheading);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(99, 102, 241);
        this.pdf.text('Key Insights', margin, this.yPosition);
        this.yPosition += 10;

        stats.models.slice(0, 3).forEach(model => {
            if (this.yPosition > PDF_CONFIG.pageHeight - 30) {
                this.addNewPage();
            }

            this.pdf.setFontSize(fontSize.body);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(55, 65, 81);
            const insightLines = this.pdf.splitTextToSize(`- ${model.insight}`, contentWidth - 10);
            this.pdf.text(insightLines, margin + 5, this.yPosition);
            this.yPosition += insightLines.length * 5 + 5;
        });
    }

    /**
     * Render Conclusion Section
     */
    private renderConclusion(report: GeneratedReport): void {
        const { margin, contentWidth, fontSize } = PDF_CONFIG;

        this.renderSectionHeader('5. Conclusion & Recommendations');

        // Summary
        this.pdf.setFontSize(fontSize.subheading);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(31, 41, 55);
        this.pdf.text('Summary of Findings', margin, this.yPosition);
        this.yPosition += 10;

        report.detailedFindings.slice(0, 5).forEach(finding => {
            if (this.yPosition > PDF_CONFIG.pageHeight - 30) {
                this.addNewPage();
            }

            this.pdf.setFontSize(fontSize.body);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(55, 65, 81);
            const findingLines = this.pdf.splitTextToSize(`- ${finding}`, contentWidth - 10);
            this.pdf.text(findingLines, margin + 5, this.yPosition);
            this.yPosition += findingLines.length * 5 + 3;
        });

        this.yPosition += 15;

        // Recommendations Box
        this.pdf.setFillColor(243, 244, 246);
        this.pdf.roundedRect(margin, this.yPosition, contentWidth, 60, 3, 3, 'F');

        this.pdf.setFontSize(fontSize.subheading);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(99, 102, 241);
        this.pdf.text('>> Recommendations', margin + 10, this.yPosition + 12);

        let recY = this.yPosition + 22;
        report.recommendations.forEach((rec, i) => {
            this.pdf.setFontSize(fontSize.body);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(55, 65, 81);
            const recLines = this.pdf.splitTextToSize(`${i + 1}. ${rec}`, contentWidth - 20);
            this.pdf.text(recLines, margin + 10, recY);
            recY += recLines.length * 5 + 3;
        });
    }

    /**
     * Render section header
     */
    private renderSectionHeader(title: string): void {
        const { margin, contentWidth, fontSize } = PDF_CONFIG;

        // Accent bar
        this.pdf.setFillColor(99, 102, 241);
        this.pdf.rect(margin, this.yPosition - 2, 4, 12, 'F');

        this.pdf.setFontSize(fontSize.heading);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(31, 41, 55);
        this.pdf.text(title, margin + 10, this.yPosition + 6);

        // Underline
        this.pdf.setDrawColor(229, 231, 235);
        this.pdf.line(margin, this.yPosition + 12, margin + contentWidth, this.yPosition + 12);

        this.yPosition += 25;
    }

    /**
     * Add new page
     */
    private addNewPage(): void {
        this.pdf.addPage();
        this.pageNumber++;
        this.yPosition = PDF_CONFIG.margin;
    }

    /**
     * Add page numbers to all pages
     */
    private addPageNumbers(): void {
        const totalPages = this.pdf.getNumberOfPages();

        for (let i = 1; i <= totalPages; i++) {
            this.pdf.setPage(i);
            this.pdf.setFontSize(PDF_CONFIG.fontSize.small);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(148, 163, 184);
            this.pdf.text(
                `Page ${i} of ${totalPages}`,
                PDF_CONFIG.pageWidth / 2,
                PDF_CONFIG.pageHeight - 10,
                { align: 'center' }
            );
        }
    }
}

// Singleton instance
export const pdfGenerator = new PDFGenerator();

export default pdfGenerator;
