"""
FastAPI main entry point with REST + WebSocket support.
"""
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Tuple
import uvicorn

from core.engine import SimulationEngine
from api.test_endpoints import router as stress_router, set_engine as stress_set_engine
from auto_demo import run_demo_loop

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Advanced Drone Path Optimizer API",
    version="2.0.0",
    description="Real-time drone simulation with D* Lite incremental replanning.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stress_router)

# ---------------------------------------------------------------------------
# Global simulation state (single drone for demo)
# ---------------------------------------------------------------------------
engine = SimulationEngine(rows=20, cols=20, obstacle_count=35, seed=7)
_mission_task: Optional[asyncio.Task] = None
_demo_task: Optional[asyncio.Task] = None

# Inject engine into stress router
stress_set_engine(engine)

# ---------------------------------------------------------------------------
# WebSocket connection manager
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()

# Register telemetry callback so engine broadcasts to all WS clients
async def _broadcast_telemetry(snapshot: dict):
    await manager.broadcast(snapshot)

engine.register_telemetry_callback(_broadcast_telemetry)

# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class MissionRequest(BaseModel):
    goal: Optional[List[int]] = None     # [row, col] or null for full coverage
    grid_rows: int = 20
    grid_cols: int = 20
    obstacle_count: int = 35
    step_delay: float = 0.15

class ObstacleRequest(BaseModel):
    row: int
    col: int

# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "Drone Optimizer Backend is Running", "version": "2.0.0"}

@app.get("/snapshot")
async def get_snapshot():
    """Current state of the simulation."""
    return engine.get_snapshot()

@app.post("/mission/start")
async def start_mission(req: MissionRequest):
    global engine, _mission_task

    # Re-create engine with new config
    engine = SimulationEngine(
        rows=req.grid_rows,
        cols=req.grid_cols,
        obstacle_count=req.obstacle_count,
    )
    engine.register_telemetry_callback(_broadcast_telemetry)
    engine.set_step_delay(req.step_delay)

    _raw_goal = req.goal
    goal: Optional[Tuple[int, int]] = (int(_raw_goal[0]), int(_raw_goal[1])) if _raw_goal and len(_raw_goal) == 2 else None

    if _mission_task and not _mission_task.done():
        _mission_task.cancel()

    _mission_task = asyncio.create_task(engine.start_mission(goal=goal))
    return {"status": "mission_started", "goal": goal}

@app.post("/mission/stop")
async def stop_mission():
    engine.stop_mission()
    return {"status": "stopped"}

@app.post("/obstacle/add")
async def add_obstacle(req: ObstacleRequest):
    """Dynamically add an obstacle mid-flight (simulates discovered threat)."""
    engine.add_obstacle_live(req.row, req.col)
    return {"status": "obstacle_added", "position": [req.row, req.col]}

@app.post("/demo/start")
async def start_demo():
    """Trigger the 3-minute auto-demo judging loop."""
    global _demo_task
    if _demo_task and not _demo_task.done():
        _demo_task.cancel()
    _demo_task = asyncio.create_task(
        run_demo_loop(engine, manager.broadcast)
    )
    return {"status": "demo_started"}

@app.post("/demo/stop")
async def stop_demo():
    global _demo_task
    if _demo_task and not _demo_task.done():
        _demo_task.cancel()
    return {"status": "demo_stopped"}

@app.get("/grid/config")
async def grid_config():
    return {"rows": engine.grid.rows, "cols": engine.grid.cols}

# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------
@app.websocket("/ws/telemetry")
async def telemetry_ws(websocket: WebSocket):
    await manager.connect(websocket)
    # Send initial snapshot immediately
    await websocket.send_json(engine.get_snapshot())
    try:
        while True:
            # Listen for commands from frontend (obstacle placement, etc.)
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                if msg.get("action") == "ADD_OBSTACLE":
                    engine.add_obstacle_live(msg["row"], msg["col"])
                elif msg.get("action") == "STOP":
                    engine.stop_mission()
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
