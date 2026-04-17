# Advanced Drone Path Optimizer v2.0

This is the modernized, hackathon-ready version of the Drone Path Optimizer. 

## 🚀 Key Improvements

### 1. D* Lite Algorithm
Unlike A*, which requires full recalculation whenever an obstacle is found, **D* Lite** is an incremental search algorithm. It only updates the affected nodes, making it significantly more efficient for dynamic environments where the drone discovers new obstacles on the fly.

### 2. Digital Twin Dashboard (UI/UX)
- **FastAPI Backend**: High-performance, asynchronous Python backend.
- **WebSocket Telemetry**: Real-time position and battery updates.
- **React Frontend**: A professional dashboard with modular components.

## 📁 Architecture Overview
- `backend/algorithms/`: Contains the D* Lite and advanced coverage logic.
- `backend/core/`: The physical simulation layer (Grid, Drone logic).
- `backend/api/`: FastAPI routes and WebSocket handlers.
- `frontend/src/`: React source code with custom hooks for telemetry.

## 🛠️ Quick Start

### One-Command Launch (Recommended)
Choose one of the following to launch **both** frontend and backend:

#### Option 1: npm (Linux/Mac/Windows PowerShell)
```bash
npm run dev
```

#### Option 2: Batch Script (Windows)
```bash
launch.bat
```

#### Option 3: PowerShell Script (Windows)
```powershell
.\launch.ps1
```

Then open http://localhost:3000 in your browser to see the frontend dashboard.

### Manual Setup
If you prefer to run services separately:

1. **Backend Setup** (Terminal 1):
   ```bash
   cd backend
   ..\venv\Scripts\python main.py
   # or: python -m uvicorn main:app --reload
   # Backend runs at http://localhost:8000
   ```

2. **Frontend Setup** (Terminal 2):
   ```bash
   cd frontend
   npm install
   npm run dev
   # Frontend runs at http://localhost:3000
   ```

## 📋 Requirements
- Python 3.12+
- Node.js 18+
- npm or yarn