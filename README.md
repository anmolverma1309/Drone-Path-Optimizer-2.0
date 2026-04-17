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

## 🛠️ Setup
1. **Backend**: `pip install -r requirements.txt` then `python backend/main.py`
2. **Frontend**: `npm install` then `npm run dev`
completing this here