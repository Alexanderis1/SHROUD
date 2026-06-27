"""Graph-theoretic cooperative coordination: allocation + routing.

* ``coverage_graph`` — a k-nearest-neighbour graph over the asset's structures
  (the spatial graph the coordination reasons on; exposed for metrics/MST).
* ``auction_allocate`` — a sequential single-item **auction** (CBBA-style):
  each structure is awarded to the UAV with the lowest marginal cost (current
  workload + travel from its last awarded task), which load-balances the fleet
  and keeps each UAV's route local.
* ``ordered_structures`` / ``plan_coverage`` — per-UAV **TSP route** over its
  awarded structures (nearest-neighbour seed + 2-opt), so inspection follows a
  short tour rather than an arbitrary order.

Deterministic; pure numpy + networkx.
"""

from __future__ import annotations

import networkx as nx
import numpy as np


def tsp_order(points: list[np.ndarray], start_idx: int = 0) -> list[int]:
    """Open-tour visiting order (nearest-neighbour + 2-opt) starting at start_idx."""
    pts = [np.asarray(p, float)[:2] for p in points]
    n = len(pts)
    if n <= 2:
        return list(range(n))

    def d(a, b):
        return float(np.linalg.norm(pts[a] - pts[b]))

    unvisited = set(range(n))
    order = [start_idx]
    unvisited.discard(start_idx)
    while unvisited:
        last = order[-1]
        nxt = min(unvisited, key=lambda j: d(last, j))
        order.append(nxt)
        unvisited.discard(nxt)
    # 2-opt refinement
    improved = True
    while improved:
        improved = False
        for i in range(1, n - 1):
            for k in range(i + 1, n):
                a, b = order[i - 1], order[i]
                c = order[k]
                e = order[(k + 1) % n]
                if d(a, b) + d(c, e) > d(a, c) + d(b, e) + 1e-9:
                    order[i:k + 1] = order[i:k + 1][::-1]
                    improved = True
    return order


def auction_allocate(structures, uavs, w_travel: float = 0.012) -> dict[str, list[int]]:
    """Sequential single-item auction -> {uav_id: [structure_id, ...]}."""
    assign = {u.uav_id: [] for u in uavs}
    load = {u.uav_id: 0.0 for u in uavs}
    pos = {u.uav_id: np.asarray(u.home, float)[:2].copy() for u in uavs}
    for s in sorted(structures, key=lambda s: -(s.radius * s.height)):   # big jobs first
        winner = min(uavs, key=lambda u: load[u.uav_id]
                     + w_travel * float(np.linalg.norm(pos[u.uav_id] - s.center[:2])))
        assign[winner.uav_id].append(s.id)
        load[winner.uav_id] += max(s.radius * s.height, 1.0)
        pos[winner.uav_id] = np.asarray(s.center, float)[:2].copy()
    return assign


def ordered_structures(refinery, uav, sids: list[int]) -> list[int]:
    if len(sids) <= 1:
        return list(sids)
    pts = [np.asarray(uav.home, float)] + [refinery.by_id(s).center for s in sids]
    order = tsp_order(pts, 0)
    return [sids[i - 1] for i in order if i > 0]


def plan_coverage(refinery, uav, sids: list[int], **vp_kw):
    """Tour-ordered (structure_id, CameraPose) inspection plan for one UAV."""
    plan = []
    for sid in ordered_structures(refinery, uav, sids):
        for vp in refinery.by_id(sid).inspection_viewpoints(**vp_kw):
            plan.append((sid, vp))
    return plan


def coverage_graph(structures, k: int = 3) -> nx.Graph:
    """k-NN spatial graph over structures (nodes), edge weight = centre distance."""
    g = nx.Graph()
    cents = {s.id: np.asarray(s.center, float)[:2] for s in structures}
    for s in structures:
        g.add_node(s.id, name=s.name, kind=s.kind)
    ids = list(cents)
    for i in ids:
        dists = sorted(((float(np.linalg.norm(cents[i] - cents[j])), j) for j in ids if j != i))
        for dist, j in dists[:k]:
            g.add_edge(i, j, weight=dist)
    return g


def route_length(refinery, uav, ordered_sids: list[int]) -> float:
    pts = [np.asarray(uav.home, float)[:2]] + [refinery.by_id(s).center[:2] for s in ordered_sids]
    return float(sum(np.linalg.norm(pts[i + 1] - pts[i]) for i in range(len(pts) - 1)))
