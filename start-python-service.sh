#!/bin/bash

echo "========================================"
echo "Starting Python Report Generator Service"
echo "========================================"
echo ""

cd report_generator-main

echo "Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python3 is not installed"
    echo "Please install Python3 first"
    exit 1
fi

python3 --version

echo ""
echo "Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Virtual environment created!"
else
    echo "Virtual environment already exists."
fi

echo ""
echo "Activating virtual environment..."
source venv/bin/activate

echo ""
echo "Installing/Updating dependencies..."
pip install --upgrade pip
pip install flask reportlab matplotlib pandas requests pillow pikepdf

echo ""
echo "Creating required directories..."
mkdir -p temp_reports reports image_cache

echo ""
echo "========================================"
echo "Starting Flask Application..."
echo "========================================"
echo ""
echo "Python service will run on: http://localhost:5000"
echo "Press Ctrl+C to stop the service"
echo ""

python app.py
