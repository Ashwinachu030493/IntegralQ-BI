@echo off
echo [IntegralQ-BI] Setting up Python Backend...

cd backend

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing dependencies...
pip install -r requirements.txt

echo Starting server...
echo Local API: http://localhost:8000/api/health
echo Swagger UI: http://localhost:8000/docs
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8000
