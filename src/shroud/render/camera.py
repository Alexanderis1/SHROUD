"""Pinhole camera geometry: look-at, projection, pixel rays, ray-casts.

Pure numpy; mirrors the OpenGL convention pyrender uses (camera looks down its
own -Z, +Y up, +X right). Used to (a) centre image crops on a defect, (b)
estimate a detection's 3D position by back-projecting the bbox centre onto the
target structure, and (c) score detections against truth.
"""

from __future__ import annotations

import numpy as np

from ..core.messages import CameraPose
from ..sim.infrastructure import Structure


def look_at_matrix(eye, target, up=(0.0, 0.0, 1.0)) -> np.ndarray:
    eye = np.asarray(eye, float)
    target = np.asarray(target, float)
    up = np.asarray(up, float)
    z = eye - target
    nz = np.linalg.norm(z)
    z = z / nz if nz > 1e-9 else np.array([0.0, 0.0, 1.0])
    if abs(z @ up) > 0.999:
        up = np.array([0.0, 1.0, 0.0])
    x = np.cross(up, z)
    x /= np.linalg.norm(x)
    y = np.cross(z, x)
    m = np.eye(4)
    m[:3, 0], m[:3, 1], m[:3, 2], m[:3, 3] = x, y, z, eye
    return m


def _focal_px(fov_deg: float, height: int) -> float:
    return (height / 2.0) / np.tan(np.radians(fov_deg) / 2.0)


def project(point, pose: CameraPose, w: int, h: int):
    """World point -> (u, v, depth) in pixels, or None if behind the camera."""
    m = look_at_matrix(pose.eye, pose.target, pose.up)
    pc = np.linalg.inv(m) @ np.array([point[0], point[1], point[2], 1.0])
    x, y, z = pc[:3]
    if z >= -1e-6:                       # camera looks down -Z; z>=0 is behind
        return None
    f = _focal_px(pose.fov_deg, h)
    u = w / 2.0 + f * (x / -z)
    v = h / 2.0 - f * (y / -z)
    return (float(u), float(v), float(-z))


def pixel_ray(u: float, v: float, pose: CameraPose, w: int, h: int):
    """Pixel -> (origin, unit direction) world-space ray into the scene."""
    m = look_at_matrix(pose.eye, pose.target, pose.up)
    f = _focal_px(pose.fov_deg, h)
    d_cam = np.array([(u - w / 2.0) / f, -(v - h / 2.0) / f, -1.0])
    d_world = m[:3, :3] @ d_cam
    d_world /= np.linalg.norm(d_world)
    return np.asarray(pose.eye, float), d_world


def _ray_cylinder(o, d, s: Structure):
    cx, cy, z0 = s.center
    fx, fy = o[0] - cx, o[1] - cy
    a = d[0] * d[0] + d[1] * d[1]
    if a < 1e-12:
        return None
    b = 2 * (fx * d[0] + fy * d[1])
    c = fx * fx + fy * fy - s.radius * s.radius
    disc = b * b - 4 * a * c
    if disc < 0:
        return None
    sq = np.sqrt(disc)
    best = None
    for t in ((-b - sq) / (2 * a), (-b + sq) / (2 * a)):
        if t > 1e-4:
            z = o[2] + t * d[2]
            if z0 <= z <= z0 + s.height and (best is None or t < best):
                best = t
    return None if best is None else o + best * d


def _ray_sphere(o, d, s: Structure):
    f = o - s.center
    a = float(d @ d)
    b = 2 * float(f @ d)
    c = float(f @ f) - s.radius * s.radius
    disc = b * b - 4 * a * c
    if disc < 0:
        return None
    sq = np.sqrt(disc)
    ts = sorted(t for t in ((-b - sq) / (2 * a), (-b + sq) / (2 * a)) if t > 1e-4)
    return None if not ts else o + ts[0] * d


def _ray_aabb(o, d, s: Structure):
    lo, hi = s.center - s.size, s.center + s.size
    tmin, tmax = 1e-4, 1e9
    for i in range(3):
        if abs(d[i]) < 1e-12:
            if o[i] < lo[i] or o[i] > hi[i]:
                return None
        else:
            t1 = (lo[i] - o[i]) / d[i]
            t2 = (hi[i] - o[i]) / d[i]
            if t1 > t2:
                t1, t2 = t2, t1
            tmin, tmax = max(tmin, t1), min(tmax, t2)
            if tmin > tmax:
                return None
    return o + tmin * d


def ray_structure(o, d, s: Structure):
    """Nearest hit point of ray o+t*d (t>0) on structure ``s``, or None."""
    if s.kind == "sphere":
        return _ray_sphere(o, d, s)
    if s.kind == "pipe_rack":
        return _ray_aabb(o, d, s)
    return _ray_cylinder(o, d, s)
