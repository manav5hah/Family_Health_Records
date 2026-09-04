#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=== Family Health Records & Longitudinal Health Analysis ==="

# Check virtual environment
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Setting up..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r backend/requirements.txt
else
    source .venv/bin/activate
fi



export PYTHONPATH="backend"
echo "Starting server on http://localhost:8000 ..."
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
