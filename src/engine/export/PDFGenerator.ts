/**
 * PDFGenerator.ts - PDF Report Generator
 */

import jsPDF from 'jspdf';
import type { GeneratedReport, PipelineResult, ChartConfig } from '../../types';

export class PDFGenerator {
    async generate(
        report: GeneratedReport,
        result: PipelineResult,
        charts: ChartConfig[],
        _element?: HTMLElement | null
    ): Promise<Blob> {
        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.text(report.title, 20, 30);

        doc.setFontSize(14);
        doc.text(`Domain: ${result.domain}`, 20, 50);
        doc.text(`Records: ${result.rowCount}`, 20, 60);

        doc.setFontSize(12);
        doc.text("Executive Summary:", 20, 80);
        const splitSummary = doc.splitTextToSize(report.summary, 170);
        doc.text(splitSummary, 20, 90);

        let y = 120;
        doc.text("Methodology / Cleaning Logs:", 20, y);
        y += 10;
        if (result.cleaningLogs) {
            result.cleaningLogs.forEach(log => {
                doc.setFontSize(10);
                doc.text(`- ${log}`, 25, y);
                y += 6;
            });
        }

        doc.addPage();
        doc.setFontSize(16);
        doc.text("Charts & Findings", 20, 20);

        charts.forEach((chart, i) => {
            const title = `${i + 1}. ${chart.title}`;
            doc.setFontSize(12);
            doc.text(title, 20, 40 + (i * 20));
        });

        return doc.output('blob');
    }
}

export const pdfGenerator = new PDFGenerator();
export default pdfGenerator;
