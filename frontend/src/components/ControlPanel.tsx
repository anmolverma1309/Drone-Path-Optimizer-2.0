import React, { useState } from "react";

interface ControlPanelProps {
    onStart: (config: any) => void;
    onStop: () => void;
    onAddObstacle: (row: number, col: number) => void;
    isMissionActive: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    onStart,
    onStop,
    isMissionActive,
}) => {
    const [mode, setMode] = useState<"coverage" | "navigate">("coverage");
    const [goalRow, setGoalRow] = useState(19);
    const [goalCol, setGoalCol] = useState(19);
    const [rows, setRows] = useState(20);
    const [cols, setCols] = useState(20);
    const [obstacles, setObstacles] = useState(35);
    const [speed, setSpeed] = useState(0.15);

    const handleStart = () => {
        const config: any = {
            grid_rows: rows,
            grid_cols: cols,
            obstacle_count: obstacles,
            step_delay: speed,
        };
        if (mode === "navigate") config.goal = [goalRow, goalCol];
        onStart(config);
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-5 text-sm">
            <h2 className="text-white font-bold text-base flex items-center gap-2">
                🛸 Mission Control
            </h2>

            {/* Mode toggle */}
            <div className="flex rounded-lg overflow-hidden border border-slate-600">
                <button
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${mode === "coverage"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-900 text-slate-400 hover:bg-slate-700"
                        }`}
                    onClick={() => setMode("coverage")}
                >
                    Full Coverage
                </button>
                <button
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${mode === "navigate"
                            ? "bg-purple-600 text-white"
                            : "bg-slate-900 text-slate-400 hover:bg-slate-700"
                        }`}
                    onClick={() => setMode("navigate")}
                >
                    Point Nav
                </button>
            </div>

            {/* Goal coordinates (only in navigate mode) */}
            {mode === "navigate" && (
                <div className="space-y-2">
                    <label className="text-slate-400">Goal Position</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={goalRow}
                            onChange={(e) => setGoalRow(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 text-white focus:outline-none focus:border-purple-500"
                            placeholder="Row"
                        />
                        <input
                            type="number"
                            value={goalCol}
                            onChange={(e) => setGoalCol(Number(e.target.value))}
                            className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 text-white focus:outline-none focus:border-purple-500"
                            placeholder="Col"
                        />
                    </div>
                </div>
            )}

            {/* Grid config */}
            <div className="space-y-3">
                <label className="text-slate-400 block">Grid Size</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={rows}
                        min={5} max={50}
                        onChange={(e) => setRows(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 text-white"
                        placeholder="Rows"
                    />
                    <span className="text-slate-500 self-center">×</span>
                    <input
                        type="number"
                        value={cols}
                        min={5} max={50}
                        onChange={(e) => setCols(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 text-white"
                        placeholder="Cols"
                    />
                </div>

                {/* Obstacles */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-slate-400">Obstacles</span>
                        <span className="text-cyan-400">{obstacles}</span>
                    </div>
                    <input
                        type="range" min={0} max={200}
                        value={obstacles}
                        onChange={(e) => setObstacles(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                    />
                </div>

                {/* Speed */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-slate-400">Speed</span>
                        <span className="text-cyan-400">{(1 / speed).toFixed(0)} steps/s</span>
                    </div>
                    <input
                        type="range" min={0.05} max={1} step={0.05}
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                    />
                </div>
            </div>

            {/* Hint */}
            <p className="text-xs text-slate-500">
                💡 Click on the grid to place obstacles mid-flight
            </p>

            {/* Action buttons */}
            <div className="space-y-2">
                <button
                    onClick={handleStart}
                    disabled={isMissionActive}
                    className="w-full py-2 rounded-lg font-bold text-sm transition-all bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                >
                    {isMissionActive ? "Mission Running…" : "▶ Launch Mission"}
                </button>
                <button
                    onClick={onStop}
                    disabled={!isMissionActive}
                    className="w-full py-2 rounded-lg font-bold text-sm transition-all bg-red-700 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    ⏹ Abort
                </button>
            </div>
        </div>
    );
};

export default ControlPanel;
