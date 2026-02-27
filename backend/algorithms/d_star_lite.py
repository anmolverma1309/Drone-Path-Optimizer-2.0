import heapq
import math
from typing import Dict, List, Tuple, Optional, Callable


class DStarLite:
    """
    D* Lite: Incremental Heuristic Search Algorithm.

    Far superior to A* for dynamic environments. When a new obstacle is 
    detected, D* Lite repairs only the part of the search tree that is 
    affected instead of restarting from scratch.

    Reference: Koenig, S. & Likhachev, M. (2002). D* Lite. AAAI.
    """

    def __init__(
        self,
        start: Tuple[int, int],
        goal: Tuple[int, int],
        is_blocked: Callable[[Tuple[int, int]], bool],
        grid_bounds: Tuple[int, int],
    ):
        """
        Args:
            start: (row, col) start position of the drone.
            goal:  (row, col) goal position.
            is_blocked: callable that returns True if a cell is an obstacle.
            grid_bounds: (rows, cols) dimensions of the grid.
        """
        self.start = start
        self.goal = goal
        self.is_blocked = is_blocked
        self.rows, self.cols = grid_bounds

        # last position used for km accumulation
        self.s_last = start

        # Accumulated heuristic key modifier (grows as start changes)
        self.km = 0.0

        # g[s] = cost from s to goal (reverse search)
        self.g: Dict[Tuple[int, int], float] = {}

        # rhs[s] = one-step look-ahead of g[s]
        self.rhs: Dict[Tuple[int, int], float] = {}

        # Priority queue: (key, node)
        self._open: List[Tuple[Tuple[float, float], Tuple[int, int]]] = []

        # Set for O(1) membership check
        self._open_set: set = set()

        self._initialize()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _g(self, s: Tuple[int, int]) -> float:
        return self.g.get(s, math.inf)

    def _rhs(self, s: Tuple[int, int]) -> float:
        return self.rhs.get(s, math.inf)

    def _h(self, a: Tuple[int, int], b: Tuple[int, int]) -> float:
        """Octile distance heuristic (optimal for 8-directional movement)."""
        dx = abs(a[0] - b[0])
        dy = abs(a[1] - b[1])
        return max(dx, dy) + (math.sqrt(2) - 1) * min(dx, dy)

    def _key(self, s: Tuple[int, int]) -> Tuple[float, float]:
        min_g_rhs = min(self._g(s), self._rhs(s))
        return (min_g_rhs + self._h(self.start, s) + self.km, min_g_rhs)

    def _successors(self, s: Tuple[int, int]) -> List[Tuple[int, int]]:
        """8-directional neighbours within grid bounds (skip obstacles)."""
        r, c = s
        neighbours = []
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < self.rows and 0 <= nc < self.cols:
                    neighbours.append((nr, nc))
        return neighbours

    def _cost(self, a: Tuple[int, int], b: Tuple[int, int]) -> float:
        """Edge cost: inf if blocked, else Euclidean (1 or sqrt(2))."""
        if self.is_blocked(b):
            return math.inf
        dr = abs(a[0] - b[0])
        dc = abs(a[1] - b[1])
        return math.sqrt(2) if (dr == 1 and dc == 1) else 1.0

    def _push(self, key: Tuple[float, float], s: Tuple[int, int]):
        heapq.heappush(self._open, (key, s))
        self._open_set.add(s)

    def _top_key(self) -> Tuple[float, float]:
        while self._open and self._open[0][1] not in self._open_set:
            heapq.heappop(self._open)
        if not self._open:
            return (math.inf, math.inf)
        return self._open[0][0]

    def _pop(self) -> Tuple[Tuple[float, float], Tuple[int, int]]:
        while self._open:
            key, s = heapq.heappop(self._open)
            if s in self._open_set:
                self._open_set.discard(s)
                return key, s
        raise IndexError("pop from empty priority queue")

    def _remove(self, s: Tuple[int, int]):
        self._open_set.discard(s)

    # ------------------------------------------------------------------
    # D* Lite core
    # ------------------------------------------------------------------

    def _initialize(self):
        """Initial setup — reverse Dijkstra from goal."""
        self.g.clear()
        self.rhs.clear()
        self._open.clear()
        self._open_set.clear()

        self.rhs[self.goal] = 0.0
        self._push(self._key(self.goal), self.goal)

    def _update_vertex(self, u: Tuple[int, int]):
        if u != self.goal:
            # rhs(u) = min over successors s' of [c(u,s') + g(s')]
            best = math.inf
            for sp in self._successors(u):
                best = min(best, self._cost(u, sp) + self._g(sp))
            self.rhs[u] = best

        self._remove(u)
        if self._g(u) != self._rhs(u):
            self._push(self._key(u), u)

    def compute_shortest_path(self):
        """Expand nodes until the start is locally consistent."""
        while True:
            top_key = self._top_key()
            start_key = self._key(self.start)

            if not (top_key < start_key or self._rhs(self.start) != self._g(self.start)):
                break

            if not self._open_set:
                break

            k_old, u = self._pop()
            k_new = self._key(u)

            if k_old < k_new:
                # Key has become stale, re-insert with updated key
                self._push(k_new, u)
            elif self._g(u) > self._rhs(u):
                # Overconsistent – make consistent
                self.g[u] = self._rhs(u)
                for s in self._successors(u):
                    self._update_vertex(s)
            else:
                # Underconsistent – raise g and propagate
                self.g[u] = math.inf
                self._update_vertex(u)
                for s in self._successors(u):
                    self._update_vertex(s)

    def plan(self) -> List[Tuple[int, int]]:
        """Initial path computation. Call once before moving the drone."""
        self._initialize()
        self.compute_shortest_path()
        return self.get_path()

    def update_start(self, new_start: Tuple[int, int]):
        """Move the drone to new_start and update km."""
        self.km += self._h(self.s_last, new_start)
        self.s_last = new_start
        self.start = new_start

    def handle_new_obstacles(self, new_obstacles: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """
        Efficiently repair the path when new obstacles are discovered.
        Only re-expands affected nodes instead of replanning from scratch.
        
        Returns the updated path.
        """
        for obs in new_obstacles:
            # Update all neighbours that may use this cell
            for neighbour in self._successors(obs):
                self._update_vertex(neighbour)
            # Also update the obstacle cell itself
            self._update_vertex(obs)

        self.compute_shortest_path()
        return self.get_path()

    def get_path(self) -> List[Tuple[int, int]]:
        """
        Extract the path from start → goal by greedily following minimum cost.
        Returns empty list if no path exists.
        """
        path = [self.start]
        current = self.start
        visited = {current}

        while current != self.goal:
            neighbours = self._successors(current)
            if not neighbours:
                return []  # trapped

            # Pick successor with lowest c(current, s') + g(s')
            best_s: Optional[Tuple[int, int]] = None
            best_cost = math.inf
            for s in neighbours:
                cost = self._cost(current, s) + self._g(s)
                if cost < best_cost:
                    best_cost = cost
                    best_s = s

            if best_s is None or best_cost == math.inf or best_s in visited:
                return []  # no path found

            next_s: Tuple[int, int] = best_s
            path.append(next_s)
            visited.add(next_s)
            current = next_s

        return path
