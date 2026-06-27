"""Quadrotor meshes + cooperative flight paths for the cinematic.

A simple but readable quadrotor (body + 4 arms + rotor disks) and an arc-length
route planner that flies each UAV around its assigned structures at inspection
altitude. Used to animate the fleet in the rendered fly-through.
"""

from __future__ import annotations

import math

import numpy as np
import trimesh


def quadrotor_mesh(span: float = 6.0) -> trimesh.Trimesh:
    parts = []
    body = trimesh.creation.box(extents=(span * 0.30, span * 0.30, span * 0.12))
    parts.append(body)
    for ang_deg in (45, 135, 225, 315):
        a = math.radians(ang_deg)
        arm = trimesh.creation.box(extents=(span * 0.95, span * 0.06, span * 0.05))
        arm.apply_transform(trimesh.transformations.rotation_matrix(a, [0, 0, 1]))
        parts.append(arm)
        ex, ey = math.cos(a) * span * 0.46, math.sin(a) * span * 0.46
        rotor = trimesh.creation.cylinder(radius=span * 0.24, height=span * 0.02, sections=20)
        rotor.apply_translation([ex, ey, span * 0.07])
        parts.append(rotor)
    return trimesh.util.concatenate(parts)


# Distinct, bright fleet colours (RGB 0..1).
DRONE_COLORS = [
    (0.10, 0.85, 0.95), (0.98, 0.55, 0.10), (0.55, 0.95, 0.30),
    (0.95, 0.25, 0.55), (0.65, 0.45, 0.98), (0.98, 0.85, 0.20),
    (0.30, 0.70, 0.98), (0.95, 0.40, 0.25),
]


def plan_routes(refinery, coverage: dict, fleet, altitude: float = 28.0,
                standoff: float = 18.0) -> dict:
    """Each UAV: home -> circle each assigned structure -> home (a polyline)."""
    routes = {}
    for u in fleet:
        pts = [u.home.copy()]
        for sid in coverage.get(u.uav_id, []):
            s = refinery.by_id(sid)
            for ang in (math.pi, math.pi * 1.5, 0.0, math.pi * 0.5):
                off = np.array([math.cos(ang), math.sin(ang), 0.0]) * (s.radius + standoff)
                p = s.center + off
                p[2] = altitude + (s.height * 0.15 if s.kind in ("tower", "flare") else 0.0)
                pts.append(p)
        pts.append(u.home.copy())
        routes[u.uav_id] = np.array(pts, dtype=float)
    return routes


def route_pose(route: np.ndarray, frac: float):
    """Position + yaw at arc-length fraction ``frac`` in [0,1] along the route."""
    if len(route) < 2:
        return route[0], 0.0
    segs = np.diff(route, axis=0)
    seg_len = np.linalg.norm(segs, axis=1)
    total = seg_len.sum()
    if total < 1e-6:
        return route[0], 0.0
    target = (frac % 1.0) * total
    acc = 0.0
    for i, L in enumerate(seg_len):
        if acc + L >= target:
            t = (target - acc) / max(L, 1e-6)
            pos = route[i] + t * segs[i]
            yaw = math.atan2(segs[i][1], segs[i][0])
            # gentle bob
            pos = pos.copy()
            pos[2] += 0.8 * math.sin(frac * 40.0 + i)
            return pos, yaw
        acc += L
    return route[-1], 0.0
