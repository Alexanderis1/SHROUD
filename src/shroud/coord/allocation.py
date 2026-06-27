"""Cooperative task allocation for inspection and validation.

Two allocation problems:

1. **Coverage** — assign the asset's structures (and their standoff viewpoints)
   across the low-altitude fleet, balancing travel cost. Solved with a
   capacity-balanced greedy assignment (each structure to the least-loaded
   near UAV) — a CBBA-style cooperative allocation that keeps the fleet busy
   and the makespan low.

2. **Validation tasking** — when a candidate failure is tokenised, pick the
   ``k`` distinct *other* UAVs best placed to independently re-inspect it
   (nearest, excluding the reporter and prior recognisers), each approaching
   from its own azimuth so the confirmations are genuinely independent views.

Both are deliberately small and deterministic; they consume the same
``Uav.home`` geometry the rest of the sim uses.
"""

from __future__ import annotations

import numpy as np

from ..fleet import Uav
from ..sim.infrastructure import Structure


def assign_coverage(structures: list[Structure], uavs: list[Uav]) -> dict[str, list[int]]:
    """Balanced greedy assignment of structures to UAVs -> {uav_id: [struct_id]}."""
    load = {u.uav_id: 0.0 for u in uavs}
    out: dict[str, list[int]] = {u.uav_id: [] for u in uavs}
    # largest structures first (longest jobs scheduled first -> better balance)
    order = sorted(structures, key=lambda s: -(s.radius * s.height))
    for s in order:
        best = min(uavs, key=lambda u: load[u.uav_id]
                   + 0.01 * float(np.linalg.norm(u.home[:2] - s.center[:2])))
        out[best.uav_id].append(s.id)
        load[best.uav_id] += max(s.radius * s.height, 1.0)
    return out


def select_validators(point: np.ndarray, uavs: list[Uav], k: int,
                      exclude: set[str]) -> list[Uav]:
    """The ``k`` nearest UAVs to ``point`` not in ``exclude`` (the reporter +
    prior recognisers)."""
    cands = [u for u in uavs if u.uav_id not in exclude]
    cands.sort(key=lambda u: float(np.linalg.norm(u.home - np.asarray(point, float))))
    return cands[:k]
