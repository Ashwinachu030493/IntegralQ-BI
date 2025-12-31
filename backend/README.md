# IntegralQ-BI Backend

Python FastAPI backend for enterprise data processing.

## Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload files for analysis |
| POST | `/api/analyze` | Run analysis pipeline |
| GET | `/api/health` | Health check |

## Stack

- FastAPI (async web framework)
- Pandas (data processing)
- NumPy/SciPy (statistics)
- Openpyxl (Excel parsing)
