import { useEffect, useRef, useCallback } from "react";

const SCENARIOS = [
    {
        name: "Earthquake Debris",
        color: "#f97316",
        description: "Dense rubble clusters blocking rescue routes",
        obstacleCount: 40,
    },
    {
        name: "Flood Rescue",
        color: "#60a5fa",
        description: "Linear flood channels — drone locates survivors",
        obstacleCount: 30,
    },
    {
        name: "Border Patrol",
        color: "#4ade80",
        description: "Dynamic threat insertions along the perimeter",
        obstacleCount: 25,
    },
];

const SCENARIO_DURATION_MS = 55_000; // ~55s each → 2m45s total

/**
 * useAutoDemo — triggers the 3-minute judging loop.
 *
 * @param {Object}   params
 * @param {Function} params.onScenarioChange  called with (scenario, idx) at each transition
 * @param {Function} params.onComplete        called when all 3 scenarios finish
 * @param {boolean}  params.enabled           start / stop the loop
 */
export default function useAutoDemo({ onScenarioChange, onComplete, enabled }) {
    const loopRef = useRef(null);
    const abortRef = useRef(false);

    const runLoop = useCallback(async () => {
        abortRef.current = false;

        for (let i = 0; i < SCENARIOS.length; i++) {
            if (abortRef.current) break;
            const scenario = SCENARIOS[i];
            if (onScenarioChange) onScenarioChange(scenario, i);

            // Wait for scenario duration
            await new Promise((resolve) => {
                loopRef.current = setTimeout(resolve, SCENARIO_DURATION_MS);
            });
        }

        if (!abortRef.current && onComplete) {
            onComplete();
        }
    }, [onScenarioChange, onComplete]);

    useEffect(() => {
        if (enabled) {
            runLoop();
        } else {
            abortRef.current = true;
            if (loopRef.current) clearTimeout(loopRef.current);
        }

        return () => {
            abortRef.current = true;
            if (loopRef.current) clearTimeout(loopRef.current);
        };
    }, [enabled, runLoop]);

    return { scenarios: SCENARIOS };
}
