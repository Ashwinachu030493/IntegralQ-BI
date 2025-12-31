"""
Pydantic models for API request/response validation.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    version: str


class ForecastPoint(BaseModel):
    """Single forecast data point"""
    date: str
    value: float
    is_forecast: bool


class ForecastResult(BaseModel):
    """Forecast analysis result"""
    metric: str
    date_column: str
    trend: str  # 'Upward', 'Downward', 'Stable'
    slope: float
    confidence: str
    historical_data: List[Dict[str, Any]]
    forecast_data: List[Dict[str, Any]]


class CorrelationModel(BaseModel):
    """Correlation between two variables"""
    feature_a: str
    feature_b: str
    correlation: float
    insight: str


class StatisticsResult(BaseModel):
    """Statistical analysis results"""
    row_count: int
    column_count: int
    numeric_summaries: Dict[str, Dict[str, float]]  # column -> {mean, std, min, max}
    correlations: List[CorrelationModel]
    models: List[Dict[str, Any]]


class AnalysisResult(BaseModel):
    """Complete analysis pipeline result"""
    success: bool
    domain: str
    row_count: int
    column_count: int
    numeric_columns: List[str]
    categorical_columns: List[str]
    date_columns: List[str]
    cleaning_log: List[str]
    statistics: StatisticsResult
    forecast: Optional[ForecastResult] = None
    

class FileUploadResponse(BaseModel):
    """File upload response"""
    filename: str
    size_bytes: int
    size_kb: float
    extension: str
    content_type: Optional[str]


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
    error_code: Optional[str] = None
