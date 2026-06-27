"""pyrender offscreen renderer for the refinery + baked defect decals.

Builds a pyrender scene once (steel structures + defect decals oriented to the
surface) and renders an RGB frame from any :class:`CameraPose`. Defects are real
geometry in the scene, so they appear with correct perspective and occlusion and
the CV detector genuinely works on rendered pixels.

A real high-fidelity glTF can replace the procedural structure meshes as the
visual layer (``Renderer.from_gltf``) while the decals + logical structures stay
the source of truth.
"""

from __future__ import annotations

import numpy as np

# pyrender needs a GL platform; default (pyglet) works on this Windows GPU.
import pyrender  # noqa: E402
import trimesh  # noqa: E402

from ..core.messages import CameraPose
from ..sim.defects import Defect
from ..sim.infrastructure import Refinery, Structure
from .camera import look_at_matrix

_KIND_COLOR = {
    "tank": (0.80, 0.80, 0.82),
    "tower": (0.62, 0.64, 0.66),
    "sphere": (0.86, 0.87, 0.88),
    "pipe_rack": (0.45, 0.46, 0.48),
    "flare": (0.38, 0.36, 0.34),
}


def _structure_trimesh(s: Structure) -> trimesh.Trimesh:
    if s.kind == "sphere":
        m = trimesh.creation.icosphere(subdivisions=3, radius=s.radius)
        m.apply_translation(s.center)
    elif s.kind == "pipe_rack":
        m = trimesh.creation.box(extents=(2 * s.size).tolist())
        m.apply_translation(s.center)
    else:  # vertical cylinder (tank/tower/flare): base at center.z
        m = trimesh.creation.cylinder(radius=s.radius, height=s.height, sections=36)
        m.apply_translation([s.center[0], s.center[1], s.center[2] + s.height / 2.0])
    return m


def _steel_material(color) -> pyrender.MetallicRoughnessMaterial:
    return pyrender.MetallicRoughnessMaterial(
        baseColorFactor=[*color, 1.0], metallicFactor=0.65, roughnessFactor=0.45)


def _tangent_basis(normal, shape):
    n = np.asarray(normal, float)
    n = n / (np.linalg.norm(n) + 1e-9)
    ref = np.array([0.0, 0.0, 1.0]) if abs(n[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    u = np.cross(ref, n)
    u /= np.linalg.norm(u) + 1e-9          # horizontal-ish tangent
    v = np.cross(n, u)
    v /= np.linalg.norm(v) + 1e-9          # tangent with vertical component
    if v[2] > 0:                            # make v point downward (for streaks)
        v = -v
    return u, v


def _decal_trimesh(d: Defect) -> trimesh.Trimesh:
    u, v = _tangent_basis(d.normal, d.shape)
    if d.shape == "line":                   # crack: long horizontal, thin
        hw, hh, ax_w, ax_h = d.size_m / 2, d.size_m * 0.06, u, v
    elif d.shape == "streak":               # leak: narrow, runs downward
        hw, hh, ax_w, ax_h = d.size_m * 0.18, d.size_m / 2, u, v
    else:                                    # patch / blob
        hw, hh, ax_w, ax_h = d.size_m / 2, d.size_m / 2, u, v
    c = np.asarray(d.position, float) + np.asarray(d.normal, float) * 0.06
    verts = np.array([
        c - ax_w * hw - ax_h * hh,
        c + ax_w * hw - ax_h * hh,
        c + ax_w * hw + ax_h * hh,
        c - ax_w * hw + ax_h * hh,
    ])
    faces = np.array([[0, 1, 2], [0, 2, 3]])
    return trimesh.Trimesh(vertices=verts, faces=faces, process=False)


def _decal_material(d: Defect) -> pyrender.MetallicRoughnessMaterial:
    col = np.array(d.color, float) / 255.0
    emit = [0.0, 0.0, 0.0]
    if d.thermal > 0.4:                      # hot-spot glow: stay saturated orange,
        emit = (np.array([0.55, 0.20, 0.04]) * d.thermal).tolist()  # not washed to white
    return pyrender.MetallicRoughnessMaterial(
        baseColorFactor=[*col, 1.0], metallicFactor=0.0, roughnessFactor=0.95,
        emissiveFactor=emit, doubleSided=True)


class Renderer:
    def __init__(self, refinery: Refinery, defects: list[Defect],
                 width: int = 512, height: int = 384, extra_meshes=None):
        self.w, self.h = width, height
        self.scene = pyrender.Scene(bg_color=[0.55, 0.62, 0.70, 1.0],
                                    ambient_light=[0.45, 0.45, 0.47])
        if extra_meshes is None:
            for s in refinery.structures:
                tm = _structure_trimesh(s)
                self.scene.add(pyrender.Mesh.from_trimesh(tm, material=_steel_material(
                    _KIND_COLOR.get(s.kind, (0.7, 0.7, 0.7))), smooth=False))
        else:
            for m in extra_meshes:
                self.scene.add(m)
        for d in defects:
            self.scene.add(pyrender.Mesh.from_trimesh(
                _decal_trimesh(d), material=_decal_material(d), smooth=False))

        # a high "sun" looking down over the site
        center = refinery.center
        sun_pose = look_at_matrix(center + np.array([60.0, -40.0, 220.0]), center)
        self.scene.add(pyrender.DirectionalLight(color=np.ones(3), intensity=4.0), pose=sun_pose)
        self.scene.add(pyrender.DirectionalLight(color=np.ones(3), intensity=1.6),
                       pose=look_at_matrix(center + np.array([-50.0, 60.0, 120.0]), center))

        self._cam = pyrender.PerspectiveCamera(yfov=np.radians(50), aspectRatio=width / height)
        self._cam_node = self.scene.add(self._cam, pose=np.eye(4))
        self._r = pyrender.OffscreenRenderer(width, height)

    def render(self, pose: CameraPose) -> np.ndarray:
        self._cam.yfov = np.radians(pose.fov_deg)
        self._cam.aspectRatio = self.w / self.h
        self.scene.set_pose(self._cam_node, look_at_matrix(pose.eye, pose.target, pose.up))
        color, _ = self._r.render(self.scene)
        return np.ascontiguousarray(color[:, :, :3])

    def render_depth(self, pose: CameraPose):
        self._cam.yfov = np.radians(pose.fov_deg)
        self.scene.set_pose(self._cam_node, look_at_matrix(pose.eye, pose.target, pose.up))
        color, depth = self._r.render(self.scene)
        return np.ascontiguousarray(color[:, :, :3]), depth

    def close(self) -> None:
        try:
            self._r.delete()
        except Exception:
            pass
