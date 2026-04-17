# Launch Drone Path Optimizer - Frontend + Backend
# Run with: .\launch.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Launching Drone Path Optimizer 2.0" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nStarting Backend (FastAPI at http://localhost:8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; ..\.venv\Scripts\python.exe main.py"

Start-Sleep -Seconds 2

Write-Host "Starting Frontend (React at http://localhost:3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Services starting..." -ForegroundColor Green
Write-Host "  Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
