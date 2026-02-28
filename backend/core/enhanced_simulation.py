"""
Enhanced simulation utilities: bulk obstacle spawning, detailed metrics,
scenario presets, and success-rate tracking for the Judge Stress Test.
"""
import random
import time
from dataclasses import dataclass, field
from typing import List, Tuple, Dict


# ── Preset scenarios ─────────────────────────────────────────────────────────

SCENARIOS: Dict[str, dict] = {
    "Earthquake Debris": {
        "description": "Dense random rubble clusters across the search zone.",
        "obstacle_density": 0.30,
        "cluster_size": 3,
        "color_theme": "#f97316",   # orange
    },
    "Flood Rescue": {
        "description": "Linear flood channels blocking escape routes.",
        "obstacle_density": 0.20,
        "cluster_size": 6,
        "color_theme": "#60a5fa",   # blue
    },
    "Border Patrol": {
        "description": "Sparse but highly dynamic threat insertions.",
        "obstacle_density": 0.15,
        "cluster_size": 1,
        "color_theme": "#4ade80",   # green
    },
}


# ── Dataclasses ──────────────────────────────────────────────────────────────

@dataclass
class ReplanEvent:
    timestamp: float
    position: Tuple[int, int]
    obstacle: Tuple[int, int]
    replan_ms: float
    success: bool


@dataclass
class SimulationMetrics:
    replan_events: List[ReplanEvent] = field(default_factory=list)
    total_steps: int = 0
    obstacles_spawned: int = 0
    start_time: float = field(default_factory=time.time)

    # ── derived properties ───────────────────────────────────────────────────

    @property
    def avg_replan_ms(self) -> float:
        if not self.replan_events:
            return 0.0
        return round(sum(e.replan_ms for e in self.replan_events) / len(self.replan_events), 2)

    @property
    def max_replan_ms(self) -> float:
        if not self.replan_events:
            return 0.0
        return round(max(e.replan_ms for e in self.replan_events), 2)

    @property
    def success_rate_pct(self) -> float:
        if not self.replan_events:
            return 100.0
        successes = sum(1 for e in self.replan_events if e.success)
        return round(successes / len(self.replan_events) * 100, 1)

    @property
    def elapsed_s(self) -> float:
        return round(time.time() - self.start_time, 1)

    def to_dict(self) -> dict:
        return {
            "avg_replan_ms": self.avg_replan_ms,
            "max_replan_ms": self.max_replan_ms,
            "success_rate_pct": self.success_rate_pct,
            "total_replans": len(self.replan_events),
            "obstacles_spawned": self.obstacles_spawned,
            "total_steps": self.total_steps,
            "elapsed_s": self.elapsed_s,
        }


# ── Helper functions ─────────────────────────────────────────────────────────

def generate_cluster_obstacles(
    rows: int,
    cols: int,
    count: int,
    cluster_size: int = 2,
    seed: int | None = None,
) -> List[Tuple[int, int]]:
    """Generate `count` obstacles in clusters of `cluster_size`."""
    rng = random.Random(seed)
    obstacles: List[Tuple[int, int]] = []
    clusters_needed = max(1, count // max(1, cluster_size))

    for _ in range(clusters_needed):
        cr = rng.randint(1, rows - 2)
        cc = rng.randint(1, cols - 2)
        for _ in range(cluster_size):
            r = max(0, min(rows - 1, cr + rng.randint(-2, 2)))
            c = max(0, min(cols - 1, cc + rng.randint(-2, 2)))
            if (r, c) not in obstacles:
                obstacles.append((r, c))
        if len(obstacles) >= count:
            break

    return obstacles[:count]


def generate_scenario_obstacles(
    scenario_name: str,
    rows: int,
    cols: int,
) -> List[Tuple[int, int]]:
    """Return obstacle list matching the scenario's profile."""
    scenario = SCENARIOS.get(scenario_name, SCENARIOS["Earthquake Debris"])
    count = int(rows * cols * scenario["obstacle_density"])
    return generate_cluster_obstacles(rows, cols, count, scenario["cluster_size"])


def record_replan(
    metrics: SimulationMetrics,
    position: Tuple[int, int],
    obstacle: Tuple[int, int],
    replan_ms: float,
    success: bool = True,
):
    """Append a replan event to the running metrics object."""
    metrics.replan_events.append(
        ReplanEvent(
            timestamp=time.time(),
            position=position,
            obstacle=obstacle,
            replan_ms=replan_ms,
            success=success,
        )
    )
    metrics.obstacles_spawned += 1
