import React, { useState, useCallback, useEffect, lazy, Suspense } from "react";
import GridOverlay from "./components/GridOverlay";
import MetricsDashboard from "./components/MetricsDashboard";
import ControlPanel from "./components/ControlPanel";
import HeroStats from "./components/HeroStats";
import StressPanel from "./components/StressPanel";
import useDroneSocket from "./hooks/useDroneSocket";
import useAutoDemo from "./hooks/useAutoDemo";
import { MissionConfig } from "./types";
import demoData from "./demo_mode.json";

// Lazy-load heavy Three.js component
const ThreeDroneArena = lazy(() => import("./components/ThreeDroneArena"));

const API = "/api";

// Construct WebSocket URL dynamically for local dev and production
const getWebSocketUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws/telemetry`;
};

type ViewMode = "2d" | "3d";

const App: React.FC = () => {
  const { droneState } = useDroneSocket(getWebSocketUrl());
  const [isMissionActive, setIsMissionActive] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [isDemoActive, setIsDemoActive] = useState(false);
  const [activeScenario, setActiveScenario] = useState(demoData.scenarios[0].name);

  // Auto-demo hook — 'D' key toggle
  useAutoDemo({
    enabled: isDemoActive,
    onScenarioChange: (scenario: { name: string }, _idx: number) => setActiveScenario(scenario.name),
    onComplete: () => setIsDemoActive(false),
  });

  // 'D' key listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "d" || e.key === "D") {
        setIsDemoActive((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Demo also calls backend loop
  useEffect(() => {
    const endpoint = isDemoActive ? "/demo/start" : "/demo/stop";
    fetch(`${API}${endpoint}`, { method: "POST" }).catch(() => { });
  }, [isDemoActive]);

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

  const handleCellClick = useCallback(async (row: number, col: number) => {
    await fetch(`${API}/obstacle/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ row, col }),
    });
  }, []);

  const status = droneState?.drone?.status;
  if (status === "mission_complete" && isMissionActive) {
    setIsMissionActive(false);
  }

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-800 bg-slate-900 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛸</span>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Drone Defense OS
            </h1>
            <p className="text-xs text-slate-500">D* Lite Incremental Path Optimizer v2.0</p>
          </div>
        </div>

        {/* View toggle + Demo toggle + Status */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {/* 2D / 3D toggle */}
          <div className="flex rounded-lg border border-slate-700 overflow-hidden">
            {(["2d", "3d"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 font-semibold uppercase text-[10px] tracking-wider transition-colors ${viewMode === v
                  ? "bg-cyan-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Demo button */}
          <button
            onClick={() => setIsDemoActive((p) => !p)}
            className={`px-3 py-1.5 rounded-lg font-semibold text-[10px] uppercase tracking-wider border transition-colors ${isDemoActive
              ? "bg-purple-800/60 border-purple-600/60 text-purple-300 animate-pulse"
              : "border-slate-600 text-slate-400 hover:border-cyan-600 hover:text-cyan-300"
              }`}
          >
            {isDemoActive ? "⏹ STOP DEMO" : "▶ AUTO DEMO (D)"}
          </button>

          <span
            className={`px-3 py-1.5 rounded-full font-semibold ${droneState ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
              }`}
          >
            {droneState ? "● CONNECTED" : "○ OFFLINE"}
          </span>
          <span className="text-slate-500 hidden md:inline">Coverage: {droneState?.coverage_pct ?? 0}%</span>
        </div>
      </header>

      {/* Demo banner */}
      {isDemoActive && (
        <div
          className="text-center text-xs py-1.5 font-bold tracking-widest animate-pulse"
          style={{ background: "linear-gradient(90deg, #7c3aed22, #0ea5e922, #7c3aed22)" }}
        >
          🎬 AUTO-DEMO ACTIVE — Scenario: {activeScenario} &nbsp;·&nbsp; Press D to stop
        </div>
      )}

      {/* Main content */}
      <main className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
        {/* Left sidebar */}
        <aside className="w-full md:w-72 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900 p-4 space-y-4 overflow-y-auto">
          <ControlPanel
            onStart={handleStart}
            onStop={handleStop}
            onAddObstacle={handleCellClick}
            isMissionActive={isMissionActive}
          />
          <MetricsDashboard data={droneState} />
        </aside>

        {/* Main canvas area */}
        <section className="flex-1 min-h-0 min-w-0 overflow-auto bg-slate-950 flex flex-col">
          <div className="flex-1 min-h-0 p-2 md:p-4 flex items-center justify-center">
            {viewMode === "3d" ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                    Loading 3D Arena…
                  </div>
                }
              >
                <ThreeDroneArena state={droneState} />
              </Suspense>
            ) : (
              <GridOverlay state={droneState} onCellClick={handleCellClick} />
            )}
          </div>
        </section>

        {/* Right sidebar */}
        <aside className="w-full md:w-72 flex-shrink-0 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900 p-4 space-y-4 overflow-y-auto">
          <HeroStats activeScenario={activeScenario} />
          <StressPanel droneState={droneState} />
        </aside>
      </main>

      <footer className="text-center text-xs text-slate-700 py-2 border-t border-slate-800">
        Drone Defense OS · FastAPI + React + Three.js + D* Lite · Press D for Auto-Demo
      </footer>
    </div>
  );
};

export default App;
