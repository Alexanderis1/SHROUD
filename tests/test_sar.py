"""High-altitude SAR: catches the deformation/thermal defects mono-EO misses."""

import numpy as np
import pytest

from shroud.core.messages import CameraPose, DefectType, SensorModality
from shroud.sim.defects import inject_defects
from shroud.sim.infrastructure import build_procedural_refinery


@pytest.fixture(scope="module")
def scene():
    ref = build_procedural_refinery(0)
    defs = inject_defects(ref, 0, 14)
    try:
        from shroud.render.renderer import Renderer
        r = Renderer(ref, defs, 720, 540)
    except Exception as e:                       # pragma: no cover
        pytest.skip(f"offscreen GL unavailable: {e}")
    yield ref, defs, r
    r.close()


def test_sar_sees_deformation_and_thermal(scene, tmp_path):
    ref, defs, r = scene
    from shroud.sensors.sar import inspect_sar
    strong = [d for d in defs if d.sar_signature >= 0.5]
    assert strong, "expected deformation/thermal defects"
    found = 0
    for d in strong:
        pose = CameraPose(eye=d.position + d.normal * 8 + np.array([6, -6, 70.0]),
                          target=d.position.copy(), fov_deg=45)
        dets = inspect_sar(r, pose, ref, defs, "uav-7", 0.0, str(tmp_path), 0)
        if any(np.linalg.norm(x.position - d.position) < 6.0 for x in dets):
            found += 1
    assert found >= 2, f"SAR found only {found}/{len(strong)} strong scatterers"


def test_sar_is_clean_and_typed(scene, tmp_path):
    ref, defs, r = scene
    from shroud.sensors.sar import inspect_sar
    pose = CameraPose(eye=ref.center + np.array([30, -30, 150.0]),
                      target=ref.center + np.array([0, 0, 10.0]), fov_deg=58)
    dets = inspect_sar(r, pose, ref, defs, "uav-7", 0.0, str(tmp_path), 0)
    assert all(x.modality == SensorModality.SAR for x in dets)
    assert all(x.defect_type in (DefectType.DEFORMATION, DefectType.THERMAL_ANOMALY) for x in dets)
    assert len(dets) <= 6, f"too many SAR detections (false positives?): {len(dets)}"
