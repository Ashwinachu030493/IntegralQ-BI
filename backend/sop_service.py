import json
import pandas as pd
from llm import llm_service
from domain_models import DataBlueprint

class SOPEngine:
    def analyze_dataset_structure(self, df: pd.DataFrame, filename: str) -> DataBlueprint:
        """
        Uses RAG to determine the Dataset Type, Grain, and Valid Charts.
        """
        # 1. Extract Metadata (Context)
        buffer = df.head(5).to_csv(index=False)
        columns = list(df.columns)
        dtypes = df.dtypes.astype(str).to_dict()
        
        # 2. Construct Prompt (The "SOP Selector")
        prompt = f"""
        You are a Data Architect. Analyze this dataset snippet and define the Analytics SOP.
        
        FILENAME: {filename}
        COLUMNS: {columns}
        TYPES: {dtypes}
        SAMPLE DATA:
        {buffer}
        
        CRITICAL RULES:
        1. Identify the Domain (HR, Sales, etc.).
        2. Identify the Primary Grain (e.g., 'EmployeeID' is better than 'LastName').
        3. Never group by high-cardinality names (like 'LastName') for distribution charts. Use 'Department', 'Role', or 'Region'.
        4. For Trends, use the primary Date column.
        5. For Correlations, use ONLY numeric columns (ignore IDs/Dates).
        
        RESPONSE FORMAT:
        Return a valid JSON matching the DataBlueprint structure.
        Example Chart: {{ "chart_type": "bar", "x_axis_col": "Department", "y_axis_col": "Year_Salary", "title": "Salary by Dept", "reasoning": "..." }}
        """

        # 3. Call LLM (Using your existing Factory)
        # Note: We force JSON mode by instruction. In Prod, use function calling if available.
        raw_response = llm_service.chat(prompt)
        
        # 4. Parse & Validate
        try:
            # Attempt to extract JSON if wrapped in markdown
            clean_json = raw_response.replace('```json', '').replace('```', '').strip()
            data = json.loads(clean_json)
            blueprint = DataBlueprint(**data)
            return blueprint
        except Exception as e:
            print(f"❌ SOP Parsing Error: {e}")
            # Fallback Blueprint if AI fails
            return self._get_fallback_blueprint(columns)

    def _get_fallback_blueprint(self, columns):
        # A safe, dumb default
        return DataBlueprint(
            domain="General",
            primary_grain="Unknown",
            numeric_columns=[],
            categorical_columns=[],
            recommended_charts=[],
            summary_insight="AI analysis failed. Using raw data view."
        )

# Singleton
sop_engine = SOPEngine()
