/**
 * SOPLibrary.ts - The Knowledge Base
 * 
 * Stores professional data analysis Standard Operating Procedures (SOPs)
 * for various domains following industry best practices.
 * Now includes report_structure for academic-style reports.
 */

import type { SOP, Domain } from '../../types';

/**
 * Standard Operating Procedures Library
 * Contains domain-specific analysis guidelines, cleaning rules, and chart preferences
 */
export const SOPLibrary: Record<Domain, SOP> = {
    finance: {
        source: "Financial Data Analytics: A Practitioner's Guide (Wiley Finance)",
        objective: "Identify key financial trends, variance analysis, and performance metrics to support strategic decision-making and risk assessment.",
        cleaning_rules: [
            "Convert currency strings to numeric values (remove $, €, £ symbols)",
            "Standardize date formats to ISO 8601",
            "Handle negative values in parentheses notation",
            "Remove duplicate transaction records",
            "Validate account codes against standard chart of accounts",
            "Flag outliers beyond 3 standard deviations for review",
            "Ensure balance sheet equations hold (Assets = Liabilities + Equity)"
        ],
        chart_priorities: ['waterfall', 'bar', 'line', 'area', 'pie'],
        recommended_metrics: ['CAGR', 'Net Profit Margin', 'R-Squared', 'Variance', 'YoY Growth'],
        report_structure: [
            "1. Introduction (Dataset Context & Business Objectives)",
            "2. Data Exploration (Feature Analysis & Visualizations)",
            "3. Methodology (Pre-processing & Data Cleaning Steps)",
            "4. Modelling & Results (Statistical Analysis & Regression)",
            "5. Conclusion & Recommendations (Actionable Insights)"
        ]
    },

    biology: {
        source: "Biostatistics: A Foundation for Analysis in the Health Sciences (Wiley)",
        objective: "Explore correlations, distributions, and patterns in biological data to support hypothesis testing and experimental validation.",
        cleaning_rules: [
            "Normalize measurement units (convert to SI units)",
            "Handle missing values with domain-appropriate imputation",
            "Remove outliers using IQR method for biological data",
            "Validate species/taxonomy codes",
            "Check for measurement instrument drift",
            "Ensure sample size requirements are met",
            "Flag contaminated or compromised samples"
        ],
        chart_priorities: ['scatter', 'boxplot', 'heatmap', 'line', 'bar'],
        recommended_metrics: ['P-Value', 'Correlation Coefficient', 'Standard Error', 'Confidence Interval', 'Effect Size'],
        report_structure: [
            "1. Introduction (Research Context & Hypothesis)",
            "2. Materials & Methods (Data Collection & Preparation)",
            "3. Data Exploration (Distributions & Visualizations)",
            "4. Statistical Analysis (Hypothesis Testing & Modelling)",
            "5. Discussion & Conclusion (Findings & Future Work)"
        ]
    },

    education: {
        source: "Educational Research: Quantitative, Qualitative, and Mixed Approaches (SAGE)",
        objective: "Analyze student performance patterns, learning outcomes, and educational intervention effectiveness.",
        cleaning_rules: [
            "Anonymize student identifiable information",
            "Standardize grade scales (convert letter grades to numeric)",
            "Handle incomplete assessment records",
            "Validate course codes and section identifiers",
            "Remove test/demo accounts from analysis",
            "Aggregate attendance data by meaningful periods",
            "Normalize scores across different assessment types"
        ],
        chart_priorities: ['bar', 'line', 'boxplot', 'scatter', 'heatmap'],
        recommended_metrics: ['Mean Score', 'Pass Rate', 'Correlation', 'Percentile Rank', 'Growth Rate'],
        report_structure: [
            "1. Introduction (Educational Context & Research Questions)",
            "2. Data Description (Student Demographics & Features)",
            "3. Methodology (Data Preparation & Analysis Approach)",
            "4. Results (Performance Analysis & Trends)",
            "5. Implications & Recommendations (Actionable Strategies)"
        ]
    },

    hr: {
        source: "HR Analytics: The What, Why, and How (Kogan Page)",
        objective: "Evaluate workforce metrics, engagement patterns, and organizational health indicators for strategic HR planning.",
        cleaning_rules: [
            "Anonymize employee personal information for GDPR/privacy compliance",
            "Standardize job titles to a common taxonomy",
            "Convert salary data to consistent currency and period",
            "Handle terminated employee records appropriately",
            "Validate department codes and reporting structures",
            "Calculate tenure and age from dates consistently",
            "Remove system/test accounts"
        ],
        chart_priorities: ['bar', 'pie', 'line', 'scatter', 'boxplot'],
        recommended_metrics: ['Turnover Rate', 'Retention Rate', 'Engagement Score', 'Time to Hire', 'Cost per Hire'],
        report_structure: [
            "1. Executive Overview (Workforce Context & Objectives)",
            "2. Data Exploration (Employee Demographics & Metrics)",
            "3. Methodology (Data Preparation & Privacy Measures)",
            "4. Analysis & Findings (Trends & Correlations)",
            "5. Strategic Recommendations (HR Action Items)"
        ]
    },

    general: {
        source: "Data Science for Business (O'Reilly Media)",
        objective: "Conduct exploratory data analysis to uncover patterns, trends, and actionable insights from the dataset.",
        cleaning_rules: [
            "Remove duplicate rows",
            "Handle missing values (drop or impute based on threshold)",
            "Convert data types appropriately",
            "Standardize text fields (trim whitespace, consistent casing)",
            "Remove or encode special characters",
            "Validate numeric ranges",
            "Check for and handle inconsistent categorical values"
        ],
        chart_priorities: ['bar', 'line', 'scatter', 'pie', 'area'],
        recommended_metrics: ['Mean', 'Median', 'Standard Deviation', 'Correlation', 'Count'],
        report_structure: [
            "1. Introduction (Dataset Overview & Objectives)",
            "2. Data Exploration (Features & Distributions)",
            "3. Methodology (Cleaning & Preparation Steps)",
            "4. Analysis & Results (Key Findings)",
            "5. Conclusion & Next Steps (Recommendations)"
        ]
    }
};

/**
 * Get SOP for a specific domain
 * Falls back to 'general' if domain not found
 */
export function getSOP(domain: Domain): SOP {
    return SOPLibrary[domain] || SOPLibrary.general;
}

/**
 * Get all available domains
 */
export function getAvailableDomains(): Domain[] {
    return Object.keys(SOPLibrary) as Domain[];
}

export default SOPLibrary;
