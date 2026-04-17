@echo off
REM Launch Drone Path Optimizer - Frontend + Backend
REM This script starts both services in separate windows

echo ========================================
echo Launching Drone Path Optimizer 2.0
echo ========================================
echo.
echo Starting Backend (FastAPI at http://localhost:8000)...
start cmd /k "cd backend && ..\.venv\Scripts\python.exe main.py"
echo.
timeout /t 2 /nobreak
echo.
echo Starting Frontend (React at http://localhost:3000)...
start cmd /k "cd frontend && npm run dev"
echo.
echo ========================================
echo Both services are starting...
echo - Backend: http://localhost:8000
echo - Frontend: http://localhost:3000
echo ========================================
echo Press any key to close this window.
pause >nul
