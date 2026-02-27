import React, { useRef, useEffect } from "react";
import { TelemetryState } from "../types";

interface GridOverlayProps {
    state: TelemetryState | null;
    onCellClick?: (row: number, col: number) => void;
}

const CELL_SIZE = 28;

const COLORS = {
    free: "#0f172a",
    obstacle: "#ef4444",
    covered: "#1e3a5f",
    threat: "#f97316",
    path: "#3b82f6",
    history: "#1d4ed8",
    drone: "#22d3ee",
    goal: "#a855f7",
    optimizedPath: "#3b82f6",
};

const GridOverlay: React.FC<GridOverlayProps> = ({ state, onCellClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!state?.grid || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const { rows, cols, grid, coverage } = state.grid;
        const drone = state.drone;

        canvas.width = cols * CELL_SIZE;
        canvas.height = rows * CELL_SIZE;

        // Build lookup sets
        const pathSet = new Set(
            (drone?.current_path || []).map((p: [number, number]) => `${p[0]},${p[1]}`)
        );
        const historySet = new Set(
            (drone?.path_history || []).map((p: [number, number]) => `${p[0]},${p[1]}`)
        );

        // Draw cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const key = `${r},${c}`;
                let color = COLORS.free;

                if (grid[r][c] === 1) {
                    color = COLORS.obstacle;
                } else if (coverage[r][c] === 1) {
                    color = COLORS.covered;
                }

                if (historySet.has(key)) color = COLORS.history;
                if (pathSet.has(key)) color = COLORS.path;

                ctx.fillStyle = color;
                ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
            }
        }

        // Draw drone
        if (drone?.position) {
            const [dr, dc] = drone.position;
            const cx = dc * CELL_SIZE + CELL_SIZE / 2;
            const cy = dr * CELL_SIZE + CELL_SIZE / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, CELL_SIZE / 2 - 3, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.drone;
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw optimized path (blue dotted line)
        if (drone?.optimized_path && drone.optimized_path.length > 0) {
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = COLORS.optimizedPath;
            ctx.lineWidth = 3;
            drone.optimized_path.forEach((p, i) => {
                const x = p[1] * CELL_SIZE + CELL_SIZE / 2;
                const y = p[0] * CELL_SIZE + CELL_SIZE / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.setLineDash([]); // reset
        }

        // Draw scanning effect
        if (drone?.is_scanning) {
            ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
            for (let i = 0; i < 20; i++) {
                const r = Math.floor(Math.random() * rows);
                const c = Math.floor(Math.random() * cols);
                ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }

        // Draw goal
        if (drone?.goal) {
            const [gr, gc] = drone.goal;
            ctx.fillStyle = COLORS.goal;
            ctx.fillRect(
                gc * CELL_SIZE + 4,
                gr * CELL_SIZE + 4,
                CELL_SIZE - 8,
                CELL_SIZE - 8
            );
        }
    }, [state]);

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!onCellClick || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);
        onCellClick(row, col);
    };

    if (!state?.grid) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 p-8 rounded-xl border border-dashed border-slate-700">
                <div className="text-4xl mb-4 animate-bounce">📡</div>
                <h3 className="text-lg font-semibold text-slate-300">Waiting for Backend</h3>
                <p className="text-sm text-slate-500 mt-2 text-center max-w-xs">
                    Please ensure the FastAPI server is running at <code className="text-cyan-400">localhost:8000</code> to view the live dashboard.
                </p>
                <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500/30 animate-pulse w-3/4"></div>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500/30 animate-pulse w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-center bg-slate-900 p-4">
            <canvas
                ref={canvasRef}
                onClick={handleClick}
                className="rounded-lg cursor-crosshair shadow-2xl shadow-cyan-900/20"
                style={{ maxWidth: "100%", maxHeight: "70vh", imageRendering: "pixelated" }}
            />
        </div>
    );
};

export default GridOverlay;
