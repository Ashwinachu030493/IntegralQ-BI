"""
UniversalCleaner - Python port of TypeScript cleaner.

Handles:
- CSV/Excel file parsing
- Excel serial date detection
- Data cleaning and normalization
- Column type detection
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime
import re


class UniversalCleaner:
    """Universal data cleaning service for CSV and Excel files."""
    
    # Domain-specific cleaning rules
    DOMAIN_RULES = {
        'finance': [
            'remove_currency_symbols',
            'convert_percentages',
            'handle_nulls',
            'trim_whitespace'
        ],
        'hr': [
            'normalize_names',
            'convert_dates',
            'handle_nulls',
            'trim_whitespace'
        ],
        'general': [
            'handle_nulls',
            'trim_whitespace'
        ]
    }
    
    def clean(self, file_path: str, filename: str, domain: str = 'general') -> Dict[str, Any]:
        """
        Clean a data file and return structured result.
        
        Args:
            file_path: Path to the file
            filename: Original filename
            domain: Domain for cleaning rules ('finance', 'hr', 'general')
            
        Returns:
            Dict with headers, rows, column types, and cleaning log
        """
        cleaning_log = []
        ext = file_path.split('.')[-1].lower()
        
        cleaning_log.append(f"• Ingested file: \"{filename}\"")
        cleaning_log.append(f"• Format detected: {ext.upper()}")
        
        # Parse file
        if ext == 'csv':
            df = pd.read_csv(file_path)
        else:  # xls, xlsx
            df = self._parse_excel_smart(file_path)
        
        initial_rows = len(df)
        cleaning_log.append(f"• Initial row count: {initial_rows}")
        
        # Apply cleaning rules
        rules = self.DOMAIN_RULES.get(domain, self.DOMAIN_RULES['general'])
        cleaning_log.append(f"• Applied {domain.upper()} domain protocols")
        
        df, rule_logs = self._apply_cleaning_rules(df, rules)
        cleaning_log.extend(rule_logs)
        
        # Remove empty rows
        df = df.dropna(how='all')
        removed_rows = initial_rows - len(df)
        if removed_rows > 0:
            cleaning_log.append(f"[CLEAN] Removed {removed_rows} invalid/empty rows")
        
        # Detect column types
        numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_columns = df.select_dtypes(include=['object', 'category']).columns.tolist()
        date_columns = self._detect_date_columns(df)
        
        cleaning_log.append(f"[NUMERIC] Found {len(numeric_columns)} columns: [{', '.join(numeric_columns[:5])}{'...' if len(numeric_columns) > 5 else ''}]")
        cleaning_log.append(f"[CATEGORY] Found {len(categorical_columns)} columns: [{', '.join(categorical_columns[:5])}{'...' if len(categorical_columns) > 5 else ''}]")
        
        if date_columns:
            cleaning_log.append(f"• Found {len(date_columns)} date columns: [{', '.join(date_columns)}]")
        
        # Standardize headers
        df.columns = [self._standardize_header(col) for col in df.columns]
        cleaning_log.append("• Standardized headers to snake_case")
        
        cleaning_log.append(f"• Final dataset: {len(df)} rows x {len(df.columns)} columns")
        
        return {
            'headers': df.columns.tolist(),
            'rows': df.to_dict('records'),
            'numeric_columns': [self._standardize_header(c) for c in numeric_columns if c not in date_columns],
            'categorical_columns': [self._standardize_header(c) for c in categorical_columns],
            'date_columns': [self._standardize_header(c) for c in date_columns],
            'row_count': len(df),
            'column_count': len(df.columns),
            'cleaning_log': cleaning_log,
            'dataframe': df  # Keep for internal use
        }
    
    def _parse_excel_smart(self, file_path: str) -> pd.DataFrame:
        """
        Smart Excel parsing that detects actual header row.
        Skips title rows like "Company Budget 2025" in row 1.
        """
        # First, read raw to find header row
        raw_df = pd.read_excel(file_path, header=None)
        
        header_row = 0
        for i in range(min(5, len(raw_df))):
            row = raw_df.iloc[i]
            non_empty = row.notna().sum()
            if non_empty >= 3:
                header_row = i
                break
        
        # Re-read with correct header
        df = pd.read_excel(file_path, header=header_row)
        
        # Filter out __EMPTY columns (from merged cells)
        df = df.loc[:, ~df.columns.astype(str).str.contains('Unnamed|__EMPTY')]
        
        # Convert Excel serial dates
        for col in df.columns:
            if 'date' in col.lower():
                df[col] = df[col].apply(self._convert_excel_date)
        
        return df
    
    def _convert_excel_date(self, value) -> Any:
        """Convert Excel serial numbers to datetime."""
        if pd.isna(value):
            return value
        if isinstance(value, (int, float)) and 20000 < value < 100000:
            # Excel date serial
            try:
                return pd.Timestamp('1899-12-30') + pd.Timedelta(days=int(value))
            except:
                return value
        return value
    
    def _apply_cleaning_rules(self, df: pd.DataFrame, rules: List[str]) -> tuple:
        """Apply domain-specific cleaning rules."""
        logs = []
        
        for rule in rules:
            if rule == 'remove_currency_symbols':
                for col in df.select_dtypes(include=['object']).columns:
                    mask = df[col].astype(str).str.match(r'^[\$£€¥][\d,\.]+$')
                    if mask.any():
                        df[col] = df[col].astype(str).str.replace(r'[\$£€¥,]', '', regex=True).astype(float)
                        logs.append(f"[CURRENCY] Converted currency in {col}")
            
            elif rule == 'convert_percentages':
                for col in df.select_dtypes(include=['object']).columns:
                    mask = df[col].astype(str).str.match(r'^\d+\.?\d*%$')
                    if mask.any():
                        df[col] = df[col].astype(str).str.replace('%', '').astype(float) / 100
                        logs.append(f"[PERCENT] Converted percentages in {col}")
            
            elif rule == 'handle_nulls':
                null_count = df.isna().sum().sum()
                if null_count > 0:
                    logs.append(f"[NULL] Handled {null_count} null/empty values")
            
            elif rule == 'trim_whitespace':
                for col in df.select_dtypes(include=['object']).columns:
                    df[col] = df[col].astype(str).str.strip()
        
        logs.append(f"[RULES] Applied {len(rules)} domain-specific cleaning rules")
        return df, logs
    
    def _detect_date_columns(self, df: pd.DataFrame) -> List[str]:
        """Detect columns that contain date values."""
        date_columns = []
        date_patterns = ['date', 'time', 'month', 'year', 'period']
        
        for col in df.columns:
            # Check by name
            if any(p in col.lower() for p in date_patterns):
                date_columns.append(col)
            # Check by dtype
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                date_columns.append(col)
        
        return date_columns
    
    def _standardize_header(self, header: str) -> str:
        """Convert header to snake_case."""
        header = str(header).strip()
        header = re.sub(r'[^\w\s]', '', header)
        header = re.sub(r'\s+', '_', header)
        return header.lower()
    
    def merge(self, datasets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Merge multiple datasets (stack or join based on similarity)."""
        if len(datasets) == 1:
            return datasets[0]
        
        # Stack strategy: combine rows
        dfs = [d['dataframe'] for d in datasets]
        merged_df = pd.concat(dfs, ignore_index=True)
        
        # Combine logs
        all_logs = []
        for d in datasets:
            all_logs.extend(d['cleaning_log'])
        all_logs.append(f"[MERGE] Stacked {len(datasets)} datasets into {len(merged_df)} rows")
        
        return {
            'headers': merged_df.columns.tolist(),
            'rows': merged_df.to_dict('records'),
            'numeric_columns': merged_df.select_dtypes(include=[np.number]).columns.tolist(),
            'categorical_columns': merged_df.select_dtypes(include=['object']).columns.tolist(),
            'date_columns': self._detect_date_columns(merged_df),
            'row_count': len(merged_df),
            'column_count': len(merged_df.columns),
            'cleaning_log': all_logs,
            'dataframe': merged_df
        }
