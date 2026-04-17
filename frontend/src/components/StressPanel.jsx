import React, { useState, useCallback, useRef } from "react";
import html2canvas from "html2canvas";

const API = "/api";

const METRICS_INIT = {
    avg_replan_ms: null,
    max_replan_ms: null,
    success_pct: null,
    speedup_factor: null,
    spawned: 0,
};

/**
 * StressPanel — Judge Stress Test interface.
 * Spawns 50 obstacles, measures D* Lite replan times, and exports judge report.
 */
export default function StressPanel({ droneState }) {
    const [metrics, setMetrics] = useState(METRICS_INIT);
    const [loading, setLoading] = useState(false);
    const [phase, setPhase] = useState("idle"); // idle | spawning | done
    const [exported, setExported] = useState(false);
    const panelRef = useRef(null);

    // ── Spawn 50 obstacles ────────────────────────────────────────────────────
    const runStressTest = useCallback(async () => {
        setLoading(true);
        setPhase("spawning");
        setMetrics(METRICS_INIT);
        try {
            const res = await fetch(`${API}/stress/spawn-obstacles`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ obstacle_count: 50 }),
            });
            const data = await res.json();
            setMetrics({
                avg_replan_ms: data.metrics.avg_replan_ms,
                max_replan_ms: data.metrics.max_replan_ms,
                success_pct: data.metrics.success_pct,
                speedup_factor: data.metrics.speedup_factor,
                spawned: data.spawned,
            });
            setPhase("done");
        } catch {
            setPhase("idle");
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Export JSON report ────────────────────────────────────────────────────
    const exportJSON = useCallback(async () => {
        const res = await fetch(`${API}/stress/export-report`);
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "drone_judge_report.json";
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    // ── Screenshot (for portfolio) ────────────────────────────────────────────
    const takeScreenshot = useCallback(async () => {
        const target = document.body;
        const canvas = await html2canvas(target, { backgroundColor: "#0a0f1e" });
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = `drone_optimizer_${Date.now()}.png`;
        a.click();
        setExported(true);
        setTimeout(() => setExported(false), 2000);
    }, []);

    // ── Derived stats ─────────────────────────────────────────────────────────
    const coverage = droneState?.coverage_pct ?? 0;
    const battery = droneState?.drone?.battery_pct ?? 100;
    const replans = droneState?.drone?.replanning_count ?? 0;

    return (
        <div
            ref={panelRef}
            className="rounded-xl border border-slate-700/60 bg-gradient-to-br from-slate-900 to-slate-950 p-4 space-y-4"
        >
            {/* Header */}
            <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                    <h2 className="text-sm font-bold text-white">JUDGE STRESS TEST</h2>
                    <p className="text-xs text-slate-500">D* Lite vs 50 dynamic obstacles</p>
                </div>
            </div>

            {/* Big CTA button */}
            <button
                onClick={runStressTest}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-bold text-sm tracking-wide transition-all duration-200 ${loading
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white shadow-lg hover:shadow-orange-500/20 active:scale-95"
                    }`}
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Spawning obstacles…
                    </span>
                ) : (
                    "🚨 SPAWN 50 OBSTACLES"
                )}
            </button>

            {/* Phase indicator */}
            {phase !== "idle" && (
                <div className="text-xs flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${phase === "spawning" ? "bg-orange-400 animate-pulse" : "bg-green-400"}`} />
                    <span className="text-slate-400">
                        {phase === "spawning" ? "Spawning & replanning…" : `✅ Done — ${metrics.spawned} obstacles handled`}
                    </span>
                </div>
            )}

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-2">
                {[
                    { label: "Avg Replan", value: metrics.avg_replan_ms !== null ? `${metrics.avg_replan_ms}ms` : "—", color: "#00d4ff" },
                    { label: "Max Replan", value: metrics.max_replan_ms !== null ? `${metrics.max_replan_ms}ms` : "—", color: "#f97316" },
                    { label: "Success Rate", value: metrics.success_pct !== null ? `${metrics.success_pct}%` : "—", color: "#4ade80" },
                    { label: "Speedup vs A*", value: metrics.speedup_factor !== null ? `${metrics.speedup_factor}x` : "—", color: "#a78bfa" },
                ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-md border border-slate-700/40 bg-slate-800/30 p-2 text-center">
                        <div className="text-[10px] text-slate-500">{label}</div>
                        <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Live mission metrics */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
                <div className="text-xs text-slate-500 font-semibold">LIVE MISSION METRICS</div>
                {[
                    { label: "Coverage", value: `${coverage}%`, pct: coverage, color: "#00d4ff" },
                    { label: "Battery", value: `${battery.toFixed(1)}%`, pct: battery, color: "#4ade80" },
                ].map(({ label, value, pct, color }) => (
                    <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">{label}</span>
                            <span style={{ color }} className="font-mono">{value}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                        </div>
                    </div>
                ))}
                <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total Replans</span>
                    <span className="text-orange-400 font-mono font-bold">{replans}</span>
                </div>
            </div>

            {/* Export actions */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={exportJSON}
                    className="py-2 rounded-lg text-xs font-semibold border border-cyan-700/50 text-cyan-400 hover:bg-cyan-900/30 transition-colors"
                >
                    📄 Export JSON
                </button>
                <button
                    onClick={takeScreenshot}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${exported
                            ? "border-green-600/50 text-green-400 bg-green-900/20"
                            : "border-slate-600/50 text-slate-300 hover:bg-slate-800/50"
                        }`}
                >
                    {exported ? "✅ Saved!" : "📷 Screenshot"}
                </button>
            </div>
        </div>
    );
}
