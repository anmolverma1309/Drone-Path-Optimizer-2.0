"""
Simulation Engine — ties together the Grid, Drone, and D* Lite algorithm.

This module runs the mission loop and exposes a clean API for the
FastAPI layer to call.
"""
import asyncio
import math
import time
from typing import List, Tuple, Optional, Callable

from core.grid import OccupancyGrid
from core.drone import Drone, DroneConfig, DroneStatus
from algorithms.d_star_lite import DStarLite


class SimulationEngine:
    """
    Orchestrates the drone mission:
    1. Generates the coverage waypoints (boustrophedon / lawnmower pattern).
    2. Uses D* Lite to navigate between waypoints.
    3. Simulates obstacle discovery and triggers incremental replanning.
    4. Emits telemetry via a registered async callback.
    """

    def __init__(
        self,
        rows: int = 20,
        cols: int = 20,
        obstacle_count: int = 30,
        seed: int = 42,
    ):
        self.grid = OccupancyGrid(rows, cols)
        self.grid.generate_random_obstacles(obstacle_count, seed=seed)

        # Drone starts at top-left corner
        start = (0, 0)
        self.drone = Drone(position=start, config=DroneConfig())
        self.grid.mark_covered_radius(*start, radius=self.drone.config.sensor_radius)

        self.running = False
        self._telemetry_cb: Optional[Callable] = None
        self._step_delay: float = 0.15   # seconds between steps

        # Mission stats
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def register_telemetry_callback(self, cb: Callable):
        """Register an async function that receives telemetry payloads."""
        self._telemetry_cb = cb

    def set_step_delay(self, delay: float):
        self._step_delay = delay

    async def start_mission(self, goal: Optional[Tuple[int, int]] = None):
        """
        Begin the full coverage mission.
        If `goal` is provided, the drone navigates there first, then does
        coverage. Otherwise the next uncovered frontier is used each time.
        """
        self.running = True
        self.start_time = time.time()
        self.drone.status = DroneStatus.ACTIVE

        if goal:
            # Point-to-point navigation mode
            await self._navigate_to(goal)
        else:
            # Full coverage mode (boustrophedon decomposition)
            await self._coverage_mission()

        self.end_time = time.time()
        self.drone.status = DroneStatus.MISSION_COMPLETE
        await self._emit_telemetry()

    def stop_mission(self):
        self.running = False

    def add_obstacle_live(self, r: int, c: int) -> List[Tuple[int, int]]:
        """
        Add a dynamic obstacle mid-flight and return the repaired path.
        Called from the REST/WebSocket endpoint when the user clicks on the grid.
        """
        self.grid.add_obstacle(r, c, dynamic=True)
        return []  # Path is repaired automatically in next navigation step

    def get_snapshot(self) -> dict:
        """Returns the full current state as a JSON-serialisable dict."""
        elapsed = round(time.time() - self.start_time, 1) if self.start_time else 0
        return {
            "drone": self.drone.to_dict(),
            "grid": self.grid.to_dict(),
            "coverage_pct": round(self.grid.get_coverage_percentage(), 1),
            "elapsed_s": elapsed,
            "running": self.running,
        }

    # ------------------------------------------------------------------
    # Mission patterns
    # ------------------------------------------------------------------

    async def _coverage_mission(self):
        """
        Boustrophedon (lawnmower) coverage pattern:
        Sweep row by row, alternating direction.
        """
        rows, cols = self.grid.rows, self.grid.cols

        for r in range(rows):
            if not self.running or not self.drone.is_alive:
                break
            col_range = range(cols) if r % 2 == 0 else range(cols - 1, -1, -1)
            for c in col_range:
                if not self.running or not self.drone.is_alive:
                    break
                if self.grid.is_free(r, c):
                    await self._navigate_to((r, c))
                    self.grid.mark_covered_radius(
                        r, c, radius=self.drone.config.sensor_radius
                    )

    async def _navigate_to(self, target: Tuple[int, int]):
        """
        Navigate the drone from its current position to `target` using D* Lite.
        Handles obstacle avoidance and incremental replanning.
        """
        planner = DStarLite(
            start=self.drone.position,
            goal=target,
            is_blocked=lambda pos: self.grid.is_occupied(pos),
            grid_bounds=(self.grid.rows, self.grid.cols),
        )

        path = planner.plan()
        if not path:
            return  # Target unreachable — skip

        # Brute-force scanning simulation
        self.drone.is_scanning = True
        self.drone.optimized_path = path

        import random
        rows, cols = self.grid.rows, self.grid.cols

        # Simulate scanning by showing random paths
        for _ in range(15):  # 15 scanning iterations
            if not self.running: break
            
            # Generate a random "scanning" path fragment
            scan_path = [self.drone.position]
            curr = list(self.drone.position)
            for _ in range(10):
                curr[0] = max(0, min(rows-1, curr[0] + random.randint(-1, 1)))
                curr[1] = max(0, min(cols-1, curr[1] + random.randint(-1, 1)))
                scan_path.append(tuple(curr))
            
            self.drone.current_path = scan_path
            await self._emit_telemetry()
            await asyncio.sleep(0.05) # fast scan

        self.drone.is_scanning = False
        self.drone.current_path = path
        path_index = 1  # skip current position

        while path_index < len(path) and self.running and self.drone.is_alive:
            next_cell = path[path_index]

            # Check if cell became blocked mid-flight
            if self.grid.is_occupied(next_cell):
                # Simulate sensor detecting new obstacle
                new_obs = [next_cell]
                planner.update_start(self.drone.position)
                path = planner.handle_new_obstacles(new_obs)
                self.drone.replanning_count += 1
                self.drone.current_path = path
                if not path:
                    break
                path_index = 1
                continue

            # Move
            self.drone.move_to(next_cell)
            self.grid.mark_covered_radius(
                *next_cell, radius=self.drone.config.sensor_radius
            )
            planner.update_start(next_cell)

            await self._emit_telemetry()
            await asyncio.sleep(self._step_delay)
            path_index += 1

    # ------------------------------------------------------------------
    # Telemetry
    # ------------------------------------------------------------------

    async def _emit_telemetry(self):
        if self._telemetry_cb:
            try:
                await self._telemetry_cb(self.get_snapshot())
            except Exception:
                pass
