"""
Auto Crypto Trading Bot - Backend Server
Run this file to start the backend API server.
"""
import sys
import io
import os

# Fix Windows cp1252 UnicodeEncodeError - force UTF-8 for all output
if sys.stdout and hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'buffer'):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
os.environ['PYTHONIOENCODING'] = 'utf-8'

import uvicorn

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("=" * 55)
    print("   AUTO CRYPTO TRADING BOT - Backend Starting...")
    print("   Dashboard API: http://localhost:8000")
    print("   API Docs:      http://localhost:8000/docs")
    print("=" * 55)
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
