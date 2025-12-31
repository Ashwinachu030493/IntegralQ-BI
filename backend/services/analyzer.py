"""
StatisticalAnalyzer - Python port of TypeScript analyzer.

Handles:
- Correlation calculations
- Linear regression forecasting
- Statistical summaries
"""

import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta


class StatisticalAnalyzer:
    """Statistical analysis service for data insights."""
    
    def analyze(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run statistical analysis on cleaned data.
        
        Args:
            data: Cleaned data dict from UniversalCleaner
            
        Returns:
            Dict with summaries, correlations, and models
        """
        df = data.get('dataframe')
        if df is None:
            df = pd.DataFrame(data['rows'])
        
        numeric_cols = data.get('numeric_columns', [])
        
        # Numeric summaries
        summaries = {}
        for col in numeric_cols:
            if col in df.columns:
                summaries[col] = {
                    'mean': float(df[col].mean()),
                    'std': float(df[col].std()),
                    'min': float(df[col].min()),
                    'max': float(df[col].max()),
                    'median': float(df[col].median())
                }
        
        # Correlation analysis
        correlations = self._calculate_correlations(df, numeric_cols)
        
        # Build models (insights)
        models = self._build_models(correlations)
        
        return {
            'row_count': len(df),
            'column_count': len(df.columns),
            'numeric_summaries': summaries,
            'correlations': correlations,
            'models': models
        }
    
    def _calculate_correlations(self, df: pd.DataFrame, numeric_cols: List[str]) -> List[Dict[str, Any]]:
        """Calculate pairwise correlations for numeric columns."""
        correlations = []
        
        # Filter to meaningful columns (exclude IDs)
        meaningful_cols = [c for c in numeric_cols if not any(
            x in c.lower() for x in ['id', 'code', 'key', 'extension']
        ) and c in df.columns]
        
        if len(meaningful_cols) < 2:
            return correlations
        
        # Calculate correlation matrix
        corr_matrix = df[meaningful_cols].corr()
        
        # Extract significant correlations
        for i, col1 in enumerate(meaningful_cols):
            for col2 in meaningful_cols[i+1:]:
                corr = corr_matrix.loc[col1, col2]
                if pd.notna(corr) and abs(corr) > 0.3:
                    correlations.append({
                        'feature_a': col1,
                        'feature_b': col2,
                        'correlation': round(float(corr), 3),
                        'insight': self._generate_insight(col1, col2, corr)
                    })
        
        # Sort by absolute correlation
        correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)
        return correlations[:10]  # Top 10
    
    def _generate_insight(self, col1: str, col2: str, corr: float) -> str:
        """Generate human-readable insight from correlation."""
        # 🛡️ ROBOT VOICE FIX: Randomized templates for variety
        weak_templates = [
            "Minimal linear relationship between {A} and {B} (r={R}).",
            "Analysis suggests {A} and {B} operate independently (r={R}).",
            "No significant correlation found between {A} and {B} (r={R}).",
            "{A} does not appear to be a strong driver of {B} (r={R})."
        ]
        
        strong_templates = [
            "Strong {DIR} relationship between {A} and {B} (r={R}).",
            "{A} is a significant indicator of {B} (r={R}).",
            "Data correlation patterns link {A} closely with {B} (r={R})."
        ]

        # Select template set
        if abs(corr) > 0.7:
            templates = strong_templates
        elif abs(corr) < 0.3:
            templates = weak_templates
        else:
            templates = ["Moderate {DIR} correlation between {A} and {B} (r={R})."]

        # Deterministic randomness based on string length (so it's stable per run)
        index = (len(col1) + len(col2) + int(corr * 100)) % len(templates)
        template = templates[index]
        
        direction = 'positive' if corr > 0 else 'negative'
        return template.format(A=col1, B=col2, R=f"{corr:.2f}", DIR=direction)
    
    def _build_models(self, correlations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build model insights from correlations."""
        models = []
        
        for corr in correlations[:5]:  # Top 5
            models.append({
                'feature': f"{corr['feature_a']}<->{corr['feature_b']}",
                'correlation': corr['correlation'],
                'insight': corr['insight'],
                'type': 'correlation'
            })
        
        return models
    
    def forecast(self, data: Dict[str, Any], months_ahead: int = 6) -> Optional[Dict[str, Any]]:
        """
        Generate linear regression forecast.
        
        Args:
            data: Cleaned data dict
            months_ahead: Number of months to forecast
            
        Returns:
            Forecast result dict or None if no suitable data
        """
        df = data.get('dataframe')
        if df is None:
            df = pd.DataFrame(data['rows'])
        
        date_cols = data.get('date_columns', [])
        numeric_cols = data.get('numeric_columns', [])
        
        if not date_cols or not numeric_cols:
            return None
        
        # Find best date column
        date_col = date_cols[0]
        
        # Find best value column (prefer revenue/sales)
        value_col = None
        priority_patterns = ['revenue', 'sales', 'amount', 'total', 'value', 'income', 'salary']
        
        for pattern in priority_patterns:
            for col in numeric_cols:
                if pattern in col.lower():
                    value_col = col
                    break
            if value_col:
                break
        
        if not value_col and numeric_cols:
            value_col = numeric_cols[0]
        
        if not value_col or date_col not in df.columns or value_col not in df.columns:
            return None
        
        try:
            # Prepare data
            df_sorted = df[[date_col, value_col]].dropna().copy()
            
            # Convert Excel serial dates if needed
            df_sorted[date_col] = df_sorted[date_col].apply(self._convert_date)
            df_sorted = df_sorted.sort_values(date_col)
            
            if len(df_sorted) < 3:
                return None
            
            # Linear regression
            x = np.arange(len(df_sorted))
            y = df_sorted[value_col].values.astype(float)
            
            slope, intercept, r_value, _, _ = stats.linregress(x, y)
            
            # Determine trend
            if abs(slope) < 0.01 * np.mean(y):
                trend = 'Stable'
            else:
                trend = 'Upward' if slope > 0 else 'Downward'
            
            # Generate forecast
            last_date = df_sorted[date_col].iloc[-1]
            forecast_data = []
            
            for i in range(1, months_ahead + 1):
                next_x = len(df_sorted) - 1 + i
                predicted = slope * next_x + intercept
                
                if isinstance(last_date, datetime):
                    next_date = last_date + timedelta(days=30*i)
                else:
                    next_date = f"Month +{i}"
                
                forecast_data.append({
                    'date': str(next_date)[:10] if isinstance(next_date, datetime) else next_date,
                    'value': max(0, round(predicted, 2)),
                    'is_forecast': True
                })
            
            # Historical data
            historical_data = [
                {
                    'date': str(row[date_col])[:10] if isinstance(row[date_col], datetime) else str(row[date_col]),
                    'value': float(row[value_col]),
                    'is_forecast': False
                }
                for _, row in df_sorted.iterrows()
            ]
            
            return {
                'metric': value_col,
                'date_column': date_col,
                'trend': trend,
                'slope': round(float(slope), 2),
                'confidence': 'Linear Regression (OLS)',
                'historical_data': historical_data,
                'forecast_data': forecast_data
            }
            
        except Exception as e:
            print(f"[Analyzer] Forecast error: {e}")
            return None
    
    def _convert_date(self, value) -> datetime:
        """Convert various date formats to datetime."""
        if isinstance(value, datetime):
            return value
        if isinstance(value, pd.Timestamp):
            return value.to_pydatetime()
        
        # Excel serial number
        if isinstance(value, (int, float)) and 20000 < value < 100000:
            return datetime(1899, 12, 30) + timedelta(days=int(value))
        
        # String parsing
        if isinstance(value, str):
            try:
                return pd.to_datetime(value).to_pydatetime()
            except:
                pass
        
        return datetime.now()
