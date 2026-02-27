from pydantic import BaseModel
from typing import List, Tuple, Optional

class DroneState(BaseModel):
    id: str = "drone-01"
    position: Tuple[int, int]
    battery: float
    status: str # "idle", "active", "returning", "low_battery"
    current_path: List[Tuple[int, int]]
    coverage_percentage: float

class MissionConfig(BaseModel):
    start_pos: Tuple[int, int]
    target_area: List[Tuple[int, int]]
    max_speed: float = 5.0
    obstacle_detection_range: int = 3

class TelemetryUpdate(BaseModel):
    drone_id: str
    lat: float
    lng: float
    battery: float
    timestamp: float
