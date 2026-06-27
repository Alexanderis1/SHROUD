"""Pure-geometry sim core: asset decomposition, defect injection, occlusion."""

import numpy as np

from shroud.sim.defects import inject_defects
from shroud.sim.infrastructure import build_procedural_refinery
from shroud.sim.occlusion import LineOfSight


def test_refinery_structure_set_is_stable():
    ref = build_procedural_refinery(0)
    assert len(ref.structures) == 20
    ids = [s.id for s in ref.structures]
    assert ids == list(range(1, 21))                       # contiguous ids
    assert sum(s.kind == "tank" for s in ref.structures) == 12
    assert any(s.kind == "flare" for s in ref.structures)
    # geo hashes are 32 bytes and unique (registry provenance)
    hashes = {s.geo_hash() for s in ref.structures}
    assert len(hashes) == 20 and all(len(h) == 32 for h in hashes)


def test_defects_on_surface_and_deterministic():
    ref = build_procedural_refinery(0)
    d1 = inject_defects(ref, 0, count=14)
    d2 = inject_defects(ref, 0, count=14)
    assert len(d1) == 14
    assert [d.id for d in d1] == [d.id for d in d2]        # deterministic
    assert [tuple(np.round(d.position, 3)) for d in d1] == \
           [tuple(np.round(d.position, 3)) for d in d2]
    for d in d1:
        assert d.structure_id in {s.id for s in ref.structures}


def test_viewpoints_generated():
    ref = build_procedural_refinery(0)
    vps = ref.all_viewpoints()
    assert len(vps) > 50
    for sid, vp in vps[:10]:
        assert vp.eye[2] >= 0.0


def test_occlusion_blocks_far_side():
    ref = build_procedural_refinery(0)
    los = LineOfSight(ref)
    s = next(x for x in ref.structures if x.kind == "tank")
    mid = s.center + np.array([0, 0, s.height / 2])
    near = mid + np.array([s.radius, 0, 0])
    far = mid - np.array([s.radius, 0, 0])
    eye = mid + np.array([s.radius + 25, 0, 0])
    # the near point (same side as the eye) is visible if we ignore its own structure
    assert los.clear(eye, near, ignore_id=s.id)
    # the far point is blocked by the tank body
    assert not los.clear(eye, far, ignore_id=-1)
