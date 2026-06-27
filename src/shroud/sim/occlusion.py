"""Line-of-sight occlusion between a camera and a surface point.

Structures block each other: a defect on a tank hidden behind another tank is
not visible from a given viewpoint. This is what makes cooperative coverage
from multiple angles genuinely necessary (and what makes the ">=3 UAV"
re-inspection from different poses meaningful). Segment-vs-primitive tests for
finite vertical cylinders, spheres and axis-aligned boxes.
"""

from __future__ import annotations

import numpy as np

from .infrastructure import Refinery, Structure

_EPS = 1e-3


def _seg_cylinder(p0, p1, s: Structure) -> bool:
    """Segment p0->p1 vs finite vertical cylinder (radius s.radius, z in [z0,z0+h])."""
    cx, cy, z0 = s.center
    d = p1 - p0
    # solve |(p0.xy + t d.xy) - c.xy|^2 = r^2
    fx, fy = p0[0] - cx, p0[1] - cy
    a = d[0] * d[0] + d[1] * d[1]
    if a < 1e-12:
        return False
    b = 2 * (fx * d[0] + fy * d[1])
    c = fx * fx + fy * fy - s.radius * s.radius
    disc = b * b - 4 * a * c
    if disc < 0:
        return False
    sq = np.sqrt(disc)
    for t in ((-b - sq) / (2 * a), (-b + sq) / (2 * a)):
        if _EPS < t < 1 - _EPS:
            z = p0[2] + t * d[2]
            if z0 - _EPS <= z <= z0 + s.height + _EPS:
                return True
    return False


def _seg_sphere(p0, p1, s: Structure) -> bool:
    d = p1 - p0
    f = p0 - s.center
    a = float(d @ d)
    if a < 1e-12:
        return False
    b = 2 * float(f @ d)
    c = float(f @ f) - s.radius * s.radius
    disc = b * b - 4 * a * c
    if disc < 0:
        return False
    sq = np.sqrt(disc)
    for t in ((-b - sq) / (2 * a), (-b + sq) / (2 * a)):
        if _EPS < t < 1 - _EPS:
            return True
    return False


def _seg_aabb(p0, p1, s: Structure) -> bool:
    lo = s.center - s.size
    hi = s.center + s.size
    d = p1 - p0
    tmin, tmax = 0.0, 1.0
    for i in range(3):
        if abs(d[i]) < 1e-12:
            if p0[i] < lo[i] - _EPS or p0[i] > hi[i] + _EPS:
                return False
        else:
            t1 = (lo[i] - p0[i]) / d[i]
            t2 = (hi[i] - p0[i]) / d[i]
            if t1 > t2:
                t1, t2 = t2, t1
            tmin = max(tmin, t1)
            tmax = min(tmax, t2)
            if tmin > tmax:
                return False
    return tmax > _EPS and tmin < 1 - _EPS


class LineOfSight:
    def __init__(self, refinery: Refinery):
        self.structures = refinery.structures

    def clear(self, eye: np.ndarray, point: np.ndarray, ignore_id: int = -1) -> bool:
        """True if no structure (other than ``ignore_id``) blocks eye->point."""
        eye = np.asarray(eye, float)
        point = np.asarray(point, float)
        for s in self.structures:
            if s.id == ignore_id:
                continue
            if s.kind == "sphere":
                hit = _seg_sphere(eye, point, s)
            elif s.kind == "pipe_rack":
                hit = _seg_aabb(eye, point, s)
            else:
                hit = _seg_cylinder(eye, point, s)
            if hit:
                return False
        return True
