@echo off
title Auto Crypto Trading Bot
color 0A
chcp 65001 >nul 2>&1
set PYTHONIOENCODING=utf-8

echo ============================================
echo   AUTO CRYPTO TRADING BOT - STARTUP
echo ============================================
echo.

:: Check Python (supports both 'py' launcher and 'python' command)
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON=py
) else (
    python --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Python not found! Install Python 3.10+ from python.org
        pause
        exit /b 1
    )
    set PYTHON=python
)

:: Check if .env exists
if not exist ".env" (
    echo [SETUP] Creating .env file from .env.example...
    copy ".env.example" ".env"
    echo [ACTION] Please open .env and add your Bybit API keys!
    echo          Then run this script again.
    notepad .env
    pause
    exit /b 0
)

:: Install dependencies if needed
if not exist "venv" (
    echo [SETUP] Creating virtual environment...
    %PYTHON% -m venv venv
)

echo [SETUP] Activating virtual environment...
call venv\Scripts\activate.bat

if not exist "venv\Lib\site-packages\fastapi" (
    echo [SETUP] Installing Python packages via USTC mirror...
    venv\Scripts\python.exe install_deps.py
)

echo.
echo [BOT] Starting backend server...
echo [INFO] API: http://localhost:8000
echo [INFO] Docs: http://localhost:8000/docs
echo.

start "Trading Bot Backend" cmd /k "chcp 65001 >nul && set PYTHONIOENCODING=utf-8 && venv\Scripts\python.exe run.py"

timeout /t 4 /nobreak >nul

:: Start Frontend if Node.js available
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [FRONTEND] Starting React dashboard...
    cd frontend
    if not exist "node_modules" (
        echo [SETUP] Installing frontend packages...
        npm.cmd install
    )
    start "Trading Bot Dashboard" cmd /k "npm.cmd start"
    cd ..
    echo [INFO] Dashboard: http://localhost:3000
) else (
    echo [INFO] Node.js not found - Frontend not started
    echo [INFO] Install Node.js from nodejs.org to enable the dashboard
)

echo.
echo ============================================
echo   Bot is running!
echo   Backend API: http://localhost:8000
echo   Dashboard:   http://localhost:3000
echo   API Docs:    http://localhost:8000/docs
echo ============================================
echo.
pause
