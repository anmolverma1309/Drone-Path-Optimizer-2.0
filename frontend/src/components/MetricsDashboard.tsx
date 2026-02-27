import React from "react";

interface MetricsProps {
    data: any;
}

const Stat: React.FC<{ label: string; value: string | number; accent?: string }> = ({
    label,
    value,
    accent = "text-cyan-400",
}) => (
    <div className="flex flex-col items-center bg-slate-800 rounded-xl p-3 border border-slate-700">
        <span className={`text-xl font-bold ${accent}`}>{value}</span>
        <span className="text-xs text-slate-400 mt-1 text-center">{label}</span>
    </div>
);

const BatteryBar: React.FC<{ pct: number }> = ({ pct }) => {
    const color =
        pct > 50 ? "bg-green-500" : pct > 20 ? "bg-yellow-400" : "bg-red-500";
    return (
        <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
};

const MetricsDashboard: React.FC<MetricsProps> = ({ data }) => {
    if (!data?.drone) {
        return (
            <div className="text-slate-500 text-sm p-4">
                Awaiting telemetry…
            </div>
        );
    }

    const { drone, coverage_pct, elapsed_s } = data;

    const statusColor: Record<string, string> = {
        idle: "text-slate-400",
        active: "text-green-400",
        planning: "text-yellow-400",
        low_battery: "text-orange-400",
        returning: "text-blue-400",
        mission_complete: "text-purple-400",
        emergency: "text-red-500",
    };

    return (
        <div className="space-y-4">
            {/* Status badge */}
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className={`text-sm font-semibold uppercase ${statusColor[drone.status] ?? "text-white"}`}>
                    {drone.status.replace("_", " ")}
                </span>
            </div>

            {/* Battery */}
            <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Battery</span>
                    <span>{drone.battery_pct}%</span>
                </div>
                <BatteryBar pct={drone.battery_pct} />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
                <Stat label="Coverage" value={`${coverage_pct}%`} accent="text-emerald-400" />
                <Stat label="Steps" value={drone.steps_taken} />
                <Stat label="Replans" value={drone.replanning_count} accent="text-yellow-400" />
                <Stat label="Distance" value={`${drone.total_distance}m`} accent="text-blue-400" />
            </div>

            {/* Position */}
            <div className="text-xs text-slate-400 bg-slate-800 rounded-lg p-2 font-mono">
                <span className="text-slate-300">POS</span>{" "}
                [{drone.position?.[0]}, {drone.position?.[1]}]
                {drone.goal && (
                    <>
                        {"  "}
                        <span className="text-purple-400">GOAL</span>{" "}
                        [{drone.goal[0]}, {drone.goal[1]}]
                    </>
                )}
            </div>

            {/* Time */}
            <div className="text-xs text-slate-500 text-right">⏱ {elapsed_s}s elapsed</div>
        </div>
    );
};

export default MetricsDashboard;
