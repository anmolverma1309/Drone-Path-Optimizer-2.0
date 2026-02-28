import React, { useEffect, useState, useRef } from "react";
import demoData from "../demo_mode.json";

const SCENARIOS = demoData.scenarios;

function CountUp({ target, duration = 2000 }) {
    const [value, setValue] = useState(0);
    const frameRef = useRef(null);

    useEffect(() => {
        const start = Date.now();
        const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration]);

    return <span>{value.toLocaleString()}</span>;
}

/**
 * HeroStats — cinematic impact dashboard.
 * Shows "Lives Saved", scenario heatmaps, and D* Lite performance KPIs.
 */
export default function HeroStats({ activeScenario }) {
    const scenario = SCENARIOS.find((s) => s.name === activeScenario) ?? SCENARIOS[0];
    const global = demoData.global_stats;

    return (
        <div className="rounded-xl border border-slate-700/60 bg-gradient-to-br from-slate-900 to-slate-950 p-4 space-y-4">

            {/* Title */}
            <div className="flex items-center gap-2">
                <span className="text-2xl">❤️</span>
                <div>
                    <h2 className="text-sm font-bold text-white">REAL-WORLD IMPACT</h2>
                    <p className="text-xs text-slate-500">Scenario: {scenario.name}</p>
                </div>
            </div>

            {/* Hero Counter */}
            <div
                className="rounded-lg p-4 text-center"
                style={{ background: `${scenario.color}15`, border: `1px solid ${scenario.color}40` }}
            >
                <div className="text-5xl font-black" style={{ color: scenario.color }}>
                    <CountUp target={scenario.lives_saved} />
                    <span className="text-2xl ml-1">↑</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">Lives Saved This Mission</div>
            </div>

            {/* Scenario description */}
            <p className="text-xs text-slate-400 leading-relaxed">{scenario.description}</p>

            {/* Scenario selector pills */}
            <div className="space-y-2">
                {SCENARIOS.map((s) => (
                    <div
                        key={s.name}
                        className="flex items-center justify-between rounded-md px-3 py-2 text-xs"
                        style={{
                            background: s.name === scenario.name ? `${s.color}18` : "transparent",
                            border: `1px solid ${s.name === scenario.name ? s.color + "50" : "#334155"}`,
                        }}
                    >
                        <span style={{ color: s.color }} className="font-semibold">{s.name}</span>
                        <span className="text-slate-400">{s.lives_saved} rescued</span>
                    </div>
                ))}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-800" />

            {/* Performance KPIs */}
            <div className="grid grid-cols-2 gap-2">
                {[
                    { label: "Avg Replan", value: `${scenario.replan_avg_ms}ms`, color: "#00d4ff" },
                    { label: "Success Rate", value: `${scenario.success_pct}%`, color: "#4ade80" },
                    { label: "vs A*", value: "10x faster", color: "#f97316" },
                    { label: "Uptime", value: `${global.uptime_pct}%`, color: "#a78bfa" },
                ].map(({ label, value, color }) => (
                    <div
                        key={label}
                        className="rounded-md border border-slate-700/40 bg-slate-800/30 p-2 text-center"
                    >
                        <div className="text-xs text-slate-500">{label}</div>
                        <div className="text-sm font-bold" style={{ color }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Heatmap bar (cinematic) */}
            <div>
                <div className="text-xs text-slate-500 mb-1">Coverage Heatmap</div>
                <div className="flex gap-0.5 rounded overflow-hidden h-3">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 transition-all duration-700"
                            style={{
                                backgroundColor: i < 18
                                    ? `hsl(${120 - i * 3}, 70%, ${45 + i * 1.5}%)`
                                    : "#ef4444",
                            }}
                        />
                    ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                    <span>Safe ✅</span>
                    <span>Threat 🔴</span>
                </div>
            </div>
        </div>
    );
}
