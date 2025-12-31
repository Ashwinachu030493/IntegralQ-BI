from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import io
import uuid
from pydantic import BaseModel
from llm import llm_service
from sop_service import sop_engine
from domain_models import DataBlueprint

app = FastAPI()

# PRODUCTION CORS CONFIG
# We allow specific origins to prevent abuse, but for your portfolio MVP, 
# we can allow all ("*") or restrict to your Vercel domains later.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 🟢 Allow Vercel & Localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- IN-MEMORY SESSION STORAGE ---
# Stores the DataFrames so Chat and Pagination can access them later.
SESSION_STORE = {}

# --- MATH ENGINE HELPERS (The "Precision" Layer) ---
def clean_data_types(df):
    # Enforce numeric types
    for col in df.columns:
        # Heuristic: If column name implies money/count, force numeric
        if any(x in col.lower() for x in ['salary', 'price', 'cost', 'age', 'rating', 'score', 'amount', 'profit', 'sales']):
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        # Heuristic: If date
        if 'date' in col.lower() or 'time' in col.lower():
            df[col] = pd.to_datetime(df[col], errors='coerce')
    return df

def calculate_chart_data(df, req):
    """
    The Math Engine: Converts raw data into specific chart formats.
    """
    # --- 1. DISTRIBUTION (Bar/Pie) ---
    if req.chart_type in ['bar', 'pie']:
        # If Y is numeric, SUM it. If not, COUNT X.
        if req.y_axis_col and pd.api.types.is_numeric_dtype(df[req.y_axis_col]):
            agg_df = df.groupby(req.x_axis_col)[req.y_axis_col].sum().reset_index()
        else:
            agg_df = df[req.x_axis_col].value_counts().reset_index()
            agg_df.columns = [req.x_axis_col, req.y_axis_col]
        
        # Top 10 only
        return agg_df.head(10).to_dict(orient='records')

    # --- 2. TIME SERIES (Line/Area) ---
    elif req.chart_type in ['line', 'area']:
        if pd.api.types.is_datetime64_any_dtype(df[req.x_axis_col]):
             # Resample to Month
             agg_df = df.set_index(req.x_axis_col).resample('M')[req.y_axis_col].count().reset_index()
             agg_df[req.x_axis_col] = agg_df[req.x_axis_col].dt.strftime('%Y-%m')
             return agg_df.to_dict(orient='records')
        return []

    # --- 3. CORRELATION (Heatmap) ---
    elif req.chart_type == 'heatmap':
        # Auto-detect numeric columns if not specified
        numerics = df.select_dtypes(include=['number'])
        
        # If the SOP asked for specific cols, try to use them, otherwise use top 6
        cols = numerics.columns[:6] 
        if len(cols) < 2: return []

        # Calculate Pearson Correlation
        corr_matrix = df[cols].corr(method='pearson').round(2)
        
        # Flatten for Recharts: [{ x: "Salary", y: "Age", value: 0.8 }, ...]
        heatmap_data = []
        for x in cols:
            for y in cols:
                val = corr_matrix.loc[x, y]
                heatmap_data.append({
                    "x": x,
                    "y": y,
                    "value": 0 if pd.isna(val) else val
                })
        return heatmap_data

    # --- 4. CUMULATIVE (Waterfall) ---
    elif req.chart_type == 'waterfall':
        if not pd.api.types.is_numeric_dtype(df[req.y_axis_col]): return []
            
        # Sum by Category and take Top 6
        agg = df.groupby(req.x_axis_col)[req.y_axis_col].sum().reset_index()
        agg = agg.sort_values(req.y_axis_col, ascending=False).head(6)
        
        # Calculate "Floating Bars" [Start, End]
        waterfall_data = []
        cumulative = 0
        for _, row in agg.iterrows():
            val = row[req.y_axis_col]
            start = cumulative
            cumulative += val
            waterfall_data.append({
                "name": str(row[req.x_axis_col]),
                "value": [start, cumulative], # Range
                "displayValue": val,
                "isNegative": val < 0
            })
        return waterfall_data

    # --- 5. STATS (Boxplot) ---
    elif req.chart_type == 'boxplot':
        if not pd.api.types.is_numeric_dtype(df[req.y_axis_col]): return []

        # Top 5 Categories only
        top_groups = df[req.x_axis_col].value_counts().head(5).index
        boxplot_data = []
        
        for name in top_groups:
            try:
                # Extract values for this group
                values = df[df[req.x_axis_col] == name][req.y_axis_col]
                if len(values) < 2: continue
                
                # Calculate Quartiles
                stats = {
                    "name": str(name),
                    "min": float(values.min()),
                    "q1": float(values.quantile(0.25)),
                    "median": float(values.quantile(0.50)),
                    "q3": float(values.quantile(0.75)),
                    "max": float(values.max())
                }
                boxplot_data.append(stats)
            except: continue
            
        return boxplot_data

    return []

@app.get("/health")
def health_check():
    return {"status": "online", "engine": "pandas + sop_rag", "sessions_active": len(SESSION_STORE)}

@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    print(f"📥 Receiving file: {file.filename}")
    try:
        contents = await file.read()
        
        # 1. Load Data
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        # 2. Clean Data (Pandas)
        df.dropna(how='all', inplace=True)
        df = clean_data_types(df)

        # 3. GENERATE BLUEPRINT (RAG Step)
        print("🧠 Generating Analytic SOP...")
        blueprint = sop_engine.analyze_dataset_structure(df, file.filename)
        
        # 4. EXECUTE SOP (The "Math Engine")
        # Instead of sending raw rows, we calculate the charts HERE.
        precomputed_charts = []
        
        for chart_req in blueprint.recommended_charts:
            try:
                chart_data = calculate_chart_data(df, chart_req)
                if chart_data: # Only add if we got data
                    precomputed_charts.append({
                        "id": f"chart_{len(precomputed_charts)}",
                        "title": chart_req.title,
                        "type": chart_req.chart_type,
                        "data": chart_data,
                        # Pass through RAG reasoning as insight
                        "insight": chart_req.reasoning,
                        "x_key": chart_req.x_axis_col,
                        "y_key": chart_req.y_axis_col
                    })
            except Exception as e:
                print(f"⚠️ Chart Calculation Failed ({chart_req.title}): {e}")

        # 5. Store Session
        session_id = str(uuid.uuid4())
        SESSION_STORE[session_id] = df

        # 6. Legacy Stats (for Frontend Compatibility)
        stats = {
            "rowCount": len(df),
            "columnCount": len(df.columns),
            "numericColumns": list(df.select_dtypes(include=['number']).columns),
            "categoryColumns": list(df.select_dtypes(include=['object']).columns)
        }
        
        # 7. Return Response (With Session ID)
        preview_rows = df.head(100).to_dict(orient='records')
        
        # Generate summary from blueprint if possible, else fallback
        ai_narrative = {
            "title": f"{blueprint.domain} Analysis",
            "summary": [blueprint.summary_insight]
        }

        return JSONResponse(content={
            "session_id": session_id,
            "filename": file.filename,
            "stats": stats,
            "data": preview_rows, 
            "cleaning_log": ["✅ Processed by Python (Stateful Mode)", f"Rows: {len(df)}", f"Domain: {blueprint.domain}"],
            "ai_narrative": ai_narrative,
            "blueprint": blueprint.model_dump(),
            "charts": precomputed_charts 
        })

    except Exception as e:
        print(f"❌ Error: {e}")
        # Print stack trace for debugging
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW: PAGINATION ENDPOINT ---
@app.get("/data")
def get_data_page(session_id: str, page: int = 1, limit: int = 100):
    if session_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Session expired or not found.")
    
    df = SESSION_STORE[session_id]
    
    start = (page - 1) * limit
    end = start + limit
    
    paginated_data = df.iloc[start:end].to_dict(orient='records')
    return {
        "page": page,
        "limit": limit,
        "total_rows": len(df),
        "data": paginated_data
    }

# --- NEW: CHAT ENDPOINT ---
class ChatRequest(BaseModel):
    session_id: str
    message: str

@app.post("/chat")
async def chat_with_data(payload: ChatRequest):
    if payload.session_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Session expired. Please re-upload.")
    
    df = SESSION_STORE[payload.session_id]
    
    stats_context = df.describe(include='all').to_string()
    headers = ", ".join(df.columns.tolist())
    
    prompt = f"""
    You are a Data Analyst Assistant. 
    A user is asking a question about a dataset they just uploaded.
    
    DATA METADATA:
    - Columns: {headers}
    - Statistical Summary:
    {stats_context}
    
    USER QUESTION: "{payload.message}"
    
    INSTRUCTIONS:
    - Answer based ONLY on the summary stats above.
    - If the user asks for specific row details you can't see, explain that you only see the summary statistics.
    - Be concise, professional, and helpful.
    """
    
    print(f"💬 Chatting about session {payload.session_id}...")
    try:
        response_text = llm_service.chat(prompt)
        return {"response": response_text}
    except Exception as e:
        print(f"❌ Chat Error: {e}")
        raise HTTPException(status_code=500, detail="AI processing failed.")
