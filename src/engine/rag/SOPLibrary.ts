/**
 * SOPLibrary.ts - The Knowledge Base
 * 
 * Stores professional data analysis Standard Operating Procedures (SOPs)
 * for various domains following industry best practices.
 */

import type { SOP, Domain } from '../../types';

/**
 * Standard Operating Procedures Library
 */
export const SOPLibrary: Record<Domain, SOP> = {
    Finance: {
        id: 'finance-sop',
        domain: 'Finance',
        rules: [
            "Convert currency strings to numeric values",
            "Handle negative values in parentheses",
            "Validate account codes",
            "Ensure balance sheet equations hold"
        ],
        recommended_charts: ['waterfall', 'bar', 'line', 'area', 'pie']
    },
    HR: {
        id: 'hr-sop',
        domain: 'HR',
        rules: [
            "Anonymize employee personal information",
            "Standardize job titles",
            "Calculate tenure and age consistently",
            "Remove system/test accounts"
        ],
        recommended_charts: ['bar', 'pie', 'line', 'scatter', 'boxplot']
    },
    Sales: {
        id: 'sales-sop',
        domain: 'Sales',
        rules: [
            "Deduplicate transaction records",
            "Normalize region codes",
            "Validate currency conversion rates",
            "Flag negative sales amounts"
        ],
        recommended_charts: ['bar', 'line', 'heatmap', 'scatter', 'pie']
    },
    Inventory: {
        id: 'inventory-sop',
        domain: 'Inventory',
        rules: [
            "Reconcile stock counts",
            "Flag zero or negative stock",
            "Validate SKU formats",
            "Check turnover rates"
        ],
        recommended_charts: ['bar', 'heatmap', 'line', 'area', 'scatter']
    },
    Retail: {
        id: 'retail-sop',
        domain: 'Retail',
        rules: [
            "Filter test transactions",
            "Normalize store IDs",
            "Check operating hours",
            "Validate discount codes"
        ],
        recommended_charts: ['bar', 'line', 'heatmap', 'pie', 'scatter']
    },
    Tech: {
        id: 'tech-sop',
        domain: 'Tech',
        rules: [
            "Sanitize log data",
            "Parse version numbers",
            "Remove debug entries",
            "Normalize error codes"
        ],
        recommended_charts: ['line', 'heatmap', 'scatter', 'bar', 'area']
    },
    General: {
        id: 'general-sop',
        domain: 'General',
        rules: [
            "Remove duplicate rows",
            "Handle missing values",
            "Convert data types",
            "Standardize text fields",
            "Remove special characters"
        ],
        recommended_charts: ['bar', 'line', 'scatter', 'pie', 'area']
    },
    Biology: {
        id: 'biology-sop',
        domain: 'Biology',
        rules: [
            "Normalize gene identifiers",
            "Handle missing experimental data",
            "Standardize unit measurements",
            "Filter control samples"
        ],
        recommended_charts: ['scatter', 'boxplot', 'heatmap', 'line', 'bar']
    },
    Education: {
        id: 'education-sop',
        domain: 'Education',
        rules: [
            "Anonymize student IDs",
            "Standardize grading scales",
            "Calculate attendance percentages",
            "Group by cohort year"
        ],
        recommended_charts: ['bar', 'line', 'scatter', 'boxplot', 'pie']
    }
};

/**
 * Get SOP for a specific domain
 */
export function getSOP(domain: Domain): SOP {
    return SOPLibrary[domain] || SOPLibrary.General;
}

/**
 * Get all available domains
 */
export function getAvailableDomains(): Domain[] {
    return Object.keys(SOPLibrary) as Domain[];
}

export default SOPLibrary;
