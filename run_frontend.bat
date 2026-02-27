@echo off
echo Starting Drone Defense Frontend...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed. Make sure Node.js and npm are installed and in your PATH.
    pause
    exit /b
)
call npm run dev
pause
