"""
Auto-Demo orchestrator — runs a 3-minute judging loop cycling through
Earthquake Debris → Flood Rescue → Border Patrol scenarios.

Usage:
    python backend/auto_demo.py

Or triggered via WebSocket message: { "action": "START_DEMO" }
"""
import asyncio
import time
import sys
import random
from core.enhanced_simulation import SCENARIOS, generate_scenario_obstacles

# Scenario timing (seconds)
SCENARIO_DURATION = 55   # each scenario gets ~55s → 3 × 55 = 165s ≈ 2m45s

DEMO_SCENARIOS = list(SCENARIOS.keys())   # ["Earthquake Debris", "Flood Rescue", "Border Patrol"]


async def run_demo_loop(engine, broadcast_fn, rows: int = 20, cols: int = 20):
    """
    3-minute demo loop.  Cycles through 3 scenarios, automatically spawning
    obstacles and triggering replanning events for maximum judge WOW.
    """
    for idx, scenario_name in enumerate(DEMO_SCENARIOS):
        scenario = SCENARIOS[scenario_name]
        print(f"\n🎬 AUTO-DEMO  [{idx+1}/3]  {scenario_name}")
        print(f"   {scenario['description']}")

        # Emit demo event to frontend
        await broadcast_fn({
            "event": "DEMO_SCENARIO",
            "scenario": scenario_name,
            "description": scenario["description"],
            "color_theme": scenario["color_theme"],
            "scenario_index": idx,
            "total_scenarios": len(DEMO_SCENARIOS),
        })

        obstacles = generate_scenario_obstacles(scenario_name, rows, cols)
        start = time.time()

        # Trickle obstacles in over the scenario window for cinematic effect
        total_obs = len(obstacles)
        delay = SCENARIO_DURATION / max(total_obs, 1)

        for obs in obstacles:
            if time.time() - start > SCENARIO_DURATION:
                break
            engine.add_obstacle_live(*obs)
            await broadcast_fn({
                "event": "DEMO_OBSTACLE",
                "row": obs[0],
                "col": obs[1],
                "scenario": scenario_name,
            })
            await asyncio.sleep(min(delay, 0.8))

        # Pad remaining time
        remaining = SCENARIO_DURATION - (time.time() - start)
        if remaining > 0:
            await asyncio.sleep(remaining)

    # Signal demo complete
    await broadcast_fn({
        "event": "DEMO_COMPLETE",
        "message": "Auto-demo finished. All 3 scenarios demonstrated.",
    })
    print("\n✅ Auto-demo complete!")


# ── Standalone entry point ───────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    sys.path.insert(0, "backend")

    from core.engine import SimulationEngine

    demo_engine = SimulationEngine(rows=20, cols=20, obstacle_count=10, seed=1)

    async def _print_broadcast(data):
        print(f"[BROADCAST] {data.get('event','telemetry')}: {list(data.keys())}")

    asyncio.run(run_demo_loop(demo_engine, _print_broadcast))
