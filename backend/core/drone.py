import math
from dataclasses import dataclass, field
from typing import Tuple, List, Optional
from enum import Enum


class DroneStatus(str, Enum):
    IDLE = "idle"
    PLANNING = "planning"
    ACTIVE = "active"
    RETURNING = "returning"
    LOW_BATTERY = "low_battery"
    MISSION_COMPLETE = "mission_complete"
    EMERGENCY = "emergency"


@dataclass
class DroneConfig:
    """Tunable parameters for the drone simulation."""
    max_battery: float = 100.0
    battery_drain_per_move: float = 0.4      # per straight step
    battery_drain_diagonal: float = 0.56    # per diagonal step (√2 × 0.4)
    battery_drain_hover: float = 0.05       # per idle tick
    low_battery_threshold: float = 20.0
    critical_battery_threshold: float = 10.0
    sensor_radius: int = 2                  # cells visible around drone
    max_speed: float = 5.0                  # m/s (for visualisation)


@dataclass
class Drone:
    """
    Represents the physical drone model.

    Tracks position, battery, path history, velocity, and mission status.
    Decoupled from the algorithm — the engine feeds it commands.
    """
    position: Tuple[int, int]
    goal: Optional[Tuple[int, int]] = None
    config: DroneConfig = field(default_factory=DroneConfig)

    battery: float = field(init=False)
    status: DroneStatus = field(init=False, default=DroneStatus.IDLE)
    path_history: List[Tuple[int, int]] = field(init=False, default_factory=list)
    current_path: List[Tuple[int, int]] = field(init=False, default_factory=list)
    optimized_path: List[Tuple[int, int]] = field(init=False, default_factory=list)
    is_scanning: bool = field(init=False, default=False)
    total_distance: float = field(init=False, default=0.0)
    replanning_count: int = field(init=False, default=0)
    steps_taken: int = field(init=False, default=0)

    def __post_init__(self):
        self.battery = self.config.max_battery
        self.path_history.append(self.position)

    # ------------------------------------------------------------------
    # Movement
    # ------------------------------------------------------------------

    def move_to(self, new_pos: Tuple[int, int]):
        """
        Move one step to new_pos. Deducts battery cost based on
        whether the step is straight or diagonal.
        """
        dr = abs(new_pos[0] - self.position[0])
        dc = abs(new_pos[1] - self.position[1])
        is_diagonal = (dr == 1 and dc == 1)

        drain = (
            self.config.battery_drain_diagonal
            if is_diagonal
            else self.config.battery_drain_per_move
        )

        dist = math.sqrt(2) if is_diagonal else 1.0
        self.total_distance += dist
        self.battery = max(0.0, self.battery - drain)
        self.position = new_pos
        self.path_history.append(new_pos)
        self.steps_taken += 1
        self._update_status()

    def hover(self):
        """Tick battery while stationary (e.g., waiting for replan)."""
        self.battery = max(0.0, self.battery - self.config.battery_drain_hover)
        self._update_status()

    # ------------------------------------------------------------------
    # Status helpers
    # ------------------------------------------------------------------

    def _update_status(self):
        if self.battery <= 0:
            self.status = DroneStatus.EMERGENCY
        elif self.battery <= self.config.critical_battery_threshold:
            self.status = DroneStatus.LOW_BATTERY

    def can_reach(self, destination: Tuple[int, int]) -> bool:
        """
        Rough battery feasibility check using Manhattan distance.
        Accounts for return-to-home leg.
        """
        dr = abs(destination[0] - self.position[0])
        dc = abs(destination[1] - self.position[1])
        steps_estimate = max(dr, dc)  # Chebyshev distance
        cost_estimate = steps_estimate * self.config.battery_drain_per_move
        # Add 20% safety margin for obstacles
        return self.battery >= cost_estimate * 1.2

    @property
    def battery_pct(self) -> float:
        return self.battery / self.config.max_battery * 100

    @property
    def is_low_battery(self) -> bool:
        return self.battery <= self.config.low_battery_threshold

    @property
    def is_alive(self) -> bool:
        return self.battery > 0 and self.status != DroneStatus.EMERGENCY

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "position": list(self.position),
            "goal": list(self.goal) if self.goal else None,
            "battery": round(self.battery, 2),
            "battery_pct": round(self.battery_pct, 1),
            "status": self.status.value,
            "steps_taken": self.steps_taken,
            "total_distance": round(self.total_distance, 2),
            "replanning_count": self.replanning_count,
            "path_history": [list(p) for p in self.path_history[-50:]],  # last 50
            "current_path": [list(p) for p in self.current_path],
            "optimized_path": [list(p) for p in self.optimized_path],
            "is_scanning": self.is_scanning,
        }
