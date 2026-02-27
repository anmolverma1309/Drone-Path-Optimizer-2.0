import numpy as np
from typing import Tuple, List, Set, Optional
import random


class OccupancyGrid:
    """
    High-performance occupancy grid using NumPy.

    Tracks:
      - Obstacle positions (static + dynamically discovered)
      - Coverage (which cells the drone has scanned)
      - Heat signatures (simulated threat zones)
    """

    # Cell type constants
    FREE = 0
    OBSTACLE = 1
    THREAT = 2

    def __init__(self, rows: int, cols: int):
        self.rows = rows
        self.cols = cols

        # Primary map: free / obstacle / threat
        self.grid = np.zeros((rows, cols), dtype=np.int8)

        # Coverage map: 0 = unscanned, 1 = scanned
        self.coverage_map = np.zeros((rows, cols), dtype=np.int8)

        # Heat map: float array 0.0–1.0, used for threat visualization
        self.heat_map = np.zeros((rows, cols), dtype=np.float32)

        # Track obstacles added dynamically during flight
        self.dynamic_obstacles: Set[Tuple[int, int]] = set()

    # ------------------------------------------------------------------
    # Obstacle management
    # ------------------------------------------------------------------

    def add_obstacle(self, r: int, c: int, dynamic: bool = False):
        """Place an obstacle at (r, c)."""
        if self._in_bounds(r, c):
            self.grid[r, c] = self.OBSTACLE
            if dynamic:
                self.dynamic_obstacles.add((r, c))

    def remove_obstacle(self, r: int, c: int):
        """Clear an obstacle (e.g., moving obstacle has left)."""
        if self._in_bounds(r, c):
            self.grid[r, c] = self.FREE
            self.dynamic_obstacles.discard((r, c))

    def bulk_add_obstacles(self, positions: List[Tuple[int, int]]):
        for r, c in positions:
            self.add_obstacle(r, c)

    def generate_random_obstacles(self, count: int, seed: int = 42):
        """Generate random static obstacles (useful for demo / testing)."""
        rng = random.Random(seed)
        placed = 0
        while placed < count:
            r = rng.randint(1, self.rows - 2)
            c = rng.randint(1, self.cols - 2)
            if self.grid[r, c] == self.FREE:
                self.add_obstacle(r, c)
                placed += 1

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

    def is_free(self, r: int, c: int) -> bool:
        if not self._in_bounds(r, c):
            return False
        return self.grid[r, c] == self.FREE

    def is_occupied(self, pos: Tuple[int, int]) -> bool:
        r, c = pos
        if not self._in_bounds(r, c):
            return True
        return self.grid[r, c] != self.FREE

    def _in_bounds(self, r: int, c: int) -> bool:
        return 0 <= r < self.rows and 0 <= c < self.cols

    # ------------------------------------------------------------------
    # Coverage tracking
    # ------------------------------------------------------------------

    def mark_covered(self, r: int, c: int):
        if self._in_bounds(r, c):
            self.coverage_map[r, c] = 1

    def mark_covered_radius(self, r: int, c: int, radius: int = 1):
        """Mark a circular area around (r, c) as covered (sensor FOV)."""
        for dr in range(-radius, radius + 1):
            for dc in range(-radius, radius + 1):
                if dr * dr + dc * dc <= radius * radius:
                    nr, nc = r + dr, c + dc
                    self.mark_covered(nr, nc)

    def get_coverage_percentage(self) -> float:
        free_cells = np.sum(self.grid == self.FREE)
        if free_cells == 0:
            return 100.0
        covered = np.sum((self.coverage_map == 1) & (self.grid == self.FREE))
        return float(covered / free_cells * 100)

    def get_uncovered_frontier(self) -> List[Tuple[int, int]]:
        """Returns list of free, unscanned cells — the frontier to explore."""
        ys, xs = np.where((self.coverage_map == 0) & (self.grid == self.FREE))
        return list(zip(ys.tolist(), xs.tolist()))

    # ------------------------------------------------------------------
    # Serialisation (for WebSocket JSON streaming)
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "rows": self.rows,
            "cols": self.cols,
            "grid": self.grid.tolist(),
            "coverage": self.coverage_map.tolist(),
            "heat": self.heat_map.tolist(),
        }
