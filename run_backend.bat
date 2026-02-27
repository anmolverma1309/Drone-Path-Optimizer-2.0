@echo off
echo Starting Drone Defense Backend...
cd backend
python -m pip install -r ..\requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] pip not found or failed. Attempting to start server anyway...
)
python main.py
pause
