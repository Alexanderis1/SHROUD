"""The critical-infrastructure asset, decomposed into named structures.

A refinery / tank farm is modelled as a set of :class:`Structure` primitives
(storage tanks, distillation towers, pipe racks, spherical LPG tanks, a flare
stack). Each structure:

* maps 1:1 to an on-chain building-registry entry (``geo_hash`` is its
  provenance fingerprint);
* exposes deterministic **surface points + normals** (where defects live and
  what a camera ray hits);
* generates standoff **inspection viewpoints** (the nodes of the cooperative
  coverage graph).

This is the *logical* asset — exact, deterministic ground truth. A real
high-fidelity glTF mesh is georeferenced onto the same world frame for
photographic rendering (see ``shroud.render``); the logical structures remain
the source of truth for registry mapping, viewpoints and defect placement.

Pure-numpy (no heavy deps) so it is fast and unit-testable. World frame: x, y
horizontal metres, z up, ground at z = 0.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field

import numpy as np

from ..core.messages import CameraPose


def _geo_hash(*parts) -> bytes:
    h = hashlib.sha256()
    for p in parts:
        h.update(repr(p).encode())
    return h.digest()  # 32 bytes


@dataclass
class Structure:
    """One inspectable structure (a registry 'building')."""
    id: int
    name: str
    kind: str                      # tank | tower | pipe_rack | sphere | flare
    center: np.ndarray             # base centre (x, y, 0) for cyl; centre for sphere/box
    radius: float = 6.0            # cylinder/sphere radius
    height: float = 12.0           # cylinder/box height
    size: np.ndarray | None = None # box half-extents (sx, sy, sz) for pipe_rack

    def geo_hash(self) -> bytes:
        c = np.round(self.center, 2).tolist()
        s = None if self.size is None else np.round(self.size, 2).tolist()
        return _geo_hash(self.name, self.kind, c, round(self.radius, 2), round(self.height, 2), s)

    # ---- geometry -------------------------------------------------------
    def axis_point(self, frac: float) -> np.ndarray:
        """Point on the vertical axis at height fraction ``frac`` in [0,1]."""
        return self.center + np.array([0.0, 0.0, frac * self.height])

    def surface_points(self, n: int, rng: np.random.Generator) -> list[tuple[np.ndarray, np.ndarray]]:
        """``n`` random (point, outward-normal) pairs on the visible surface."""
        out = []
        if self.kind in ("tank", "tower", "flare"):
            for _ in range(n):
                th = rng.uniform(0, 2 * np.pi)
                z = rng.uniform(0.08, 0.96) * self.height
                nrm = np.array([np.cos(th), np.sin(th), 0.0])
                p = self.center + np.array([self.radius * np.cos(th), self.radius * np.sin(th), z])
                out.append((p, nrm))
        elif self.kind == "sphere":
            for _ in range(n):
                v = rng.normal(size=3)
                v[2] = abs(v[2]) * 0.6 + 0.2          # bias to upper hemisphere (visible)
                v /= np.linalg.norm(v)
                out.append((self.center + self.radius * v, v.copy()))
        else:  # pipe_rack (box) — sample the long vertical faces and top
            sx, sy, sz = self.size
            for _ in range(n):
                face = rng.integers(0, 3)
                if face == 0:    # +/-x face
                    sgn = rng.choice([-1.0, 1.0])
                    p = self.center + np.array([sgn * sx, rng.uniform(-sy, sy), rng.uniform(-sz, sz)])
                    nrm = np.array([sgn, 0.0, 0.0])
                elif face == 1:  # +/-y face
                    sgn = rng.choice([-1.0, 1.0])
                    p = self.center + np.array([rng.uniform(-sx, sx), sgn * sy, rng.uniform(-sz, sz)])
                    nrm = np.array([0.0, sgn, 0.0])
                else:            # top
                    p = self.center + np.array([rng.uniform(-sx, sx), rng.uniform(-sy, sy), sz])
                    nrm = np.array([0.0, 0.0, 1.0])
                out.append((p, nrm))
        return out

    def inspection_viewpoints(self, standoff: float = 14.0, n_az: int = 8,
                              height_fracs=(0.35, 0.75)) -> list[CameraPose]:
        """Standoff camera poses that look at the structure — coverage-graph nodes."""
        poses = []
        if self.kind == "pipe_rack":
            sx, sy, sz = self.size
            reach = float(max(sx, sy)) + standoff
            for hz in height_fracs:
                zc = self.center[2] + (hz * 2 - 1) * sz
                for k in range(n_az):
                    th = 2 * np.pi * k / n_az
                    eye = self.center + np.array([reach * np.cos(th), reach * np.sin(th), zc - self.center[2]])
                    eye[2] = max(eye[2], 3.0)
                    target = np.array([self.center[0], self.center[1], zc])
                    poses.append(CameraPose(eye=eye, target=target, fov_deg=55))
            return poses
        r = self.radius + standoff
        for hz in height_fracs:
            tgt = self.axis_point(hz)
            for k in range(n_az):
                th = 2 * np.pi * k / n_az
                eye = self.center + np.array([r * np.cos(th), r * np.sin(th), tgt[2] - self.center[2]])
                eye[2] = max(eye[2], 3.0)
                poses.append(CameraPose(eye=eye, target=tgt, fov_deg=50))
        return poses


@dataclass
class Refinery:
    """The whole asset: structures + site geometry + service points."""
    structures: list[Structure]
    bounds: tuple[float, float, float, float]   # (xmin, ymin, xmax, ymax)
    charging_stations: list[np.ndarray] = field(default_factory=list)
    name: str = "Refinery Alpha"

    def by_id(self, sid: int) -> Structure:
        return self._index[sid]

    def __post_init__(self):
        self._index = {s.id: s for s in self.structures}

    @property
    def center(self) -> np.ndarray:
        xmin, ymin, xmax, ymax = self.bounds
        return np.array([(xmin + xmax) / 2, (ymin + ymax) / 2, 0.0])

    def all_viewpoints(self, **kw) -> list[tuple[int, CameraPose]]:
        out = []
        for s in self.structures:
            for vp in s.inspection_viewpoints(**kw):
                out.append((s.id, vp))
        return out

    def manifest(self) -> dict:
        return {
            "name": self.name,
            "bounds": list(self.bounds),
            "structures": [
                {"id": s.id, "name": s.name, "type": s.kind,
                 "center": np.round(s.center, 2).tolist(),
                 "radius": round(s.radius, 2), "height": round(s.height, 2),
                 "size": (None if s.size is None else np.round(s.size, 2).tolist()),
                 "geo_hash": s.geo_hash().hex()}
                for s in self.structures
            ],
        }


def build_procedural_refinery(seed: int = 0) -> Refinery:
    """A deterministic, realistic-ish refinery / tank farm layout.

    Storage tanks in a grid, a row of distillation towers, pipe racks linking
    them, a couple of spherical LPG tanks and a flare stack. Sizes vary with the
    seed but the structure *set* and ids are stable for a given seed.
    """
    rng = np.random.default_rng([seed, 0x5E])
    structures: list[Structure] = []
    sid = 0

    def nxt() -> int:
        nonlocal sid
        sid += 1
        return sid

    # --- crude/product storage tanks: 3 x 4 grid ---
    x0, y0, dx, dy = 30.0, 30.0, 46.0, 46.0
    tank_idx = 0
    for r in range(3):
        for c in range(4):
            tank_idx += 1
            cx = x0 + c * dx + rng.uniform(-2, 2)
            cy = y0 + r * dy + rng.uniform(-2, 2)
            rad = float(rng.uniform(8.0, 13.0))
            hgt = float(rng.uniform(12.0, 20.0))
            structures.append(Structure(
                nxt(), f"Storage Tank T-{100 + tank_idx}", "tank",
                np.array([cx, cy, 0.0]), radius=rad, height=hgt))

    # --- distillation towers: a row along the top ---
    for i in range(3):
        cx = 60.0 + i * 55.0 + rng.uniform(-3, 3)
        cy = 175.0 + rng.uniform(-3, 3)
        structures.append(Structure(
            nxt(), f"Distillation Tower C-{i + 1}", "tower",
            np.array([cx, cy, 0.0]), radius=float(rng.uniform(3.0, 4.5)),
            height=float(rng.uniform(34.0, 46.0))))

    # --- spherical LPG tanks ---
    for i in range(2):
        cx = 210.0 + rng.uniform(-3, 3)
        cy = 60.0 + i * 40.0
        rad = float(rng.uniform(7.0, 9.0))
        structures.append(Structure(
            nxt(), f"LPG Sphere S-{i + 1}", "sphere",
            np.array([cx, cy, rad + 2.0]), radius=rad, height=2 * rad))

    # --- pipe racks (long horizontal boxes) ---
    for i, (cx, cy, sx, sy) in enumerate([
        (120.0, 100.0, 60.0, 2.5), (95.0, 130.0, 2.5, 45.0)]):
        structures.append(Structure(
            nxt(), f"Pipe Rack PR-{i + 1}", "pipe_rack",
            np.array([cx, cy, 5.0]), size=np.array([sx, sy, 4.0]),
            radius=float(max(sx, sy)), height=8.0))

    # --- flare stack ---
    structures.append(Structure(
        nxt(), "Flare Stack F-1", "flare",
        np.array([245.0, 150.0, 0.0]), radius=1.6, height=58.0))

    bounds = (0.0, 0.0, 270.0, 210.0)
    charging = [np.array([5.0, 5.0, 0.0]), np.array([265.0, 5.0, 0.0]),
                np.array([5.0, 205.0, 0.0])]
    return Refinery(structures=structures, bounds=bounds, charging_stations=charging)
