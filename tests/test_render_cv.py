"""Hybrid render + CV: real offscreen renders, real OpenCV defect detection.

Skips gracefully if no GL context is available (headless CI without a GPU).
"""

import numpy as np
import pytest

from shroud.core.messages import CameraPose, DefectType
from shroud.perception import cv_detect
from shroud.render.camera import project
from shroud.sim.defects import inject_defects
from shroud.sim.infrastructure import build_procedural_refinery

W, H = 512, 384


@pytest.fixture(scope="module")
def scene():
    ref = build_procedural_refinery(0)
    defs = inject_defects(ref, 0, count=14)
    try:
        from shroud.render.renderer import Renderer
        r = Renderer(ref, defs, W, H)
    except Exception as e:                       # pragma: no cover - env dependent
        pytest.skip(f"offscreen GL unavailable: {e}")
    yield ref, defs, r
    r.close()


def test_single_view_detection_recall(scene):
    ref, defs, r = scene
    hit = typ = 0
    for d in defs:
        eye = d.position + d.normal * 13.0 + np.array([0, 0, 1.5])
        pose = CameraPose(eye=eye, target=d.position.copy(), fov_deg=45)
        dets = cv_detect.detect(r.render(pose))
        pc = project(d.position, pose, W, H)
        cx, cy = (pc[0], pc[1]) if pc else (W / 2, H / 2)
        near = [x for x in dets if abs(x.centroid[0] - cx) < 70 and abs(x.centroid[1] - cy) < 70]
        hit += len(near) > 0
        typ += any(x.defect_type == d.defect_type for x in near)
    # >= 10/14 located single-view; deformation is realistically hard for mono EO
    assert hit >= 10, f"only {hit}/14 located"
    assert typ >= 9, f"only {typ}/14 type-correct"


def test_clean_view_has_few_false_positives(scene):
    ref, defs, r = scene
    # a defect-free tank, framed so its body fills the view (minimal sky / thin
    # silhouettes that the sensor's ray-hit gating would otherwise reject)
    defect_structs = {d.structure_id for d in defs}
    clean = next(s for s in ref.structures if s.kind == "tank" and s.id not in defect_structs)
    mid = clean.center + np.array([0, 0, clean.height * 0.5])
    pose = CameraPose(eye=mid + np.array([clean.radius + 7, 0, 0]), target=mid, fov_deg=45)
    dets = cv_detect.detect(r.render(pose))
    assert len(dets) <= 1, f"unexpected false positives: {[d.defect_type.name for d in dets]}"
