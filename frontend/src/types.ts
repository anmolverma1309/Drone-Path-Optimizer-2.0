export interface GridState {
    rows: number;
    cols: number;
    grid: number[][];        // 0=free, 1=obstacle
    coverage: number[][];    // 0=uncovered, 1=covered
    heat?: number[][];
}

export interface DroneState {
    position: [number, number];   // [row, col]
    goal: [number, number] | null;
    battery: number;
    battery_pct: number;
    status: string;
    steps_taken: number;
    total_distance: number;
    replanning_count: number;
    path_history: [number, number][];
    current_path: [number, number][];
    optimized_path: [number, number][];
    is_scanning: boolean;
}

export interface TelemetryState {
    grid: GridState;
    drone: DroneState;
    coverage_pct: number;
    elapsed_s: number;
    running: boolean;
}

export interface MissionConfig {
    grid_rows: number;
    grid_cols: number;
    obstacle_count: number;
    step_delay: number;
    goal?: [number, number] | null;
}
