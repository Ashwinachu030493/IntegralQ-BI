from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class ChartRecommendation(BaseModel):
    title: str
    chart_type: Literal['bar', 'line', 'area', 'pie', 'scatter', 'heatmap', 'boxplot', 'radar']
    x_axis_col: str
    y_axis_col: str
    group_col: Optional[str] = None
    reasoning: str
    
class DataBlueprint(BaseModel):
    domain: Literal['HR', 'Sales', 'Finance', 'Inventory', 'General']
    primary_grain: str = Field(..., description="The unique identifier or main entity (e.g., EmployeeID, OrderID)")
    time_grain: Optional[str] = Field(None, description="The primary date column for trends")
    
    # Validation Rules
    numeric_columns: List[str]
    categorical_columns: List[str]
    
    # RAG-Generated SOP
    recommended_charts: List[ChartRecommendation]
    
    summary_insight: str
