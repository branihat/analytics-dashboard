@echo off
echo ========================================
echo Starting Python Report Generator Service
echo ========================================
echo.

cd report_generator-main

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo.
echo Creating virtual environment...
if not exist "venv" (
    python -m venv venv
    echo Virtual environment created!
) else (
    echo Virtual environment already exists.
)

echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing/Updating dependencies...
pip install --upgrade pip
pip install flask reportlab matplotlib pandas requests pillow pikepdf

echo.
echo Creating required directories...
if not exist "temp_reports" mkdir temp_reports
if not exist "reports" mkdir reports
if not exist "image_cache" mkdir image_cache

echo.
echo ========================================
echo Starting Flask Application...
echo ========================================
echo.
echo Python service will run on: http://localhost:5000
echo Press Ctrl+C to stop the service
echo.

python app.py

pause
