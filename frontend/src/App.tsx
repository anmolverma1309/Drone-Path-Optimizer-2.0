import React, { useState, useCallback } from "react";
import GridOverlay from "./components/GridOverlay";
import MetricsDashboard from "./components/MetricsDashboard";
import ControlPanel from "./components/ControlPanel";
import useDroneSocket from "./hooks/useDroneSocket";
import { MissionConfig } from "./types";

const API = "http://localhost:8000";

const App: React.FC = () => {
  const { droneState } = useDroneSocket("ws://localhost:8000/ws/telemetry");
  const [isMissionActive, setIsMissionActive] = useState(false);

  const handleStart = useCallback(async (config: MissionConfig) => {
    setIsMissionActive(true);
    await fetch(`${API}/mission/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  }, []);

  const handleStop = useCallback(async () => {
    setIsMissionActive(false);
    await fetch(`${API}/mission/stop`, { method: "POST" });
  }, []);

  // Called when user clicks on the canvas to place an obstacle
  const handleCellClick = useCallback(async (row: number, col: number) => {
    await fetch(`${API}/obstacle/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row, col }),
    });
  }, []);

  // Detect when mission completes
  const status = droneState?.drone?.status;
  if (status === "mission_complete" && isMissionActive) {
    setIsMissionActive(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛸</span>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Drone Defense OS
            </h1>
            <p className="text-xs text-slate-500">D* Lite Incremental Path Optimizer v2.0</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span
            className={`px-3 py-1 rounded-full font-semibold ${droneState
              ? "bg-green-900/50 text-green-400"
              : "bg-red-900/50 text-red-400"
              }`}
          >
            {droneState ? "● API CONNECTED" : "○ API DISCONNECTED"}
          </span>
          <span className="text-slate-500">Coverage: {droneState?.coverage_pct ?? 0}%</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900 p-4 space-y-4 overflow-y-auto">
          <ControlPanel
            onStart={handleStart}
            onStop={handleStop}
            onAddObstacle={handleCellClick}
            isMissionActive={isMissionActive}
          />
          <MetricsDashboard data={droneState} />
        </aside>

        {/* Grid canvas */}
        <section className="flex-1 overflow-auto bg-slate-950">
          <GridOverlay state={droneState} onCellClick={handleCellClick} />
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-700 py-2 border-t border-slate-800">
        Drone Defense OS · Built with FastAPI + React + D* Lite
      </footer>
    </div>
  );
};

export default App;
