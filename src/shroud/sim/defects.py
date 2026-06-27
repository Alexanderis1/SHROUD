"""Ground-truth defects injected onto the infrastructure.

A defect is placed at a real point on a real structure surface, so detection
can be scored against truth and its on-chain position is meaningful ("insert
defects with respect to the real information the drones and the system have").

Each defect carries a visual *appearance* (colour + shape + thermal signal)
that is the single shared contract between the renderer (which draws the mark
onto the rendered crop) and the CV detector (which keys on exactly that
signature). Quarantined as sim-side ground truth: only sensors and the
adjudicator may read it.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ..core.messages import DefectType
from .infrastructure import Refinery, Structure


@dataclass
class Defect:
    id: int
    structure_id: int
    defect_type: DefectType
    position: np.ndarray          # 3D world point on the surface
    normal: np.ndarray            # outward surface normal
    size_m: float                 # physical extent (m)
    severity: float               # 0..1 (drives contrast + detectability)
    color: tuple                  # RGB 0..255 of the visual mark
    shape: str                    # patch | line | streak | blob
    thermal: float = 0.0          # 0..1 extra hot-spot signal (IR / SAR cue)
    sar_signature: float = 0.0    # 0..1 radar return anomaly (SAR visibility)
    found_by: set = None          # eval bookkeeping: uav_ids that detected it

    def __post_init__(self):
        if self.found_by is None:
            self.found_by = set()


# Per-type visual + physical signature.
_APPEARANCE = {
    DefectType.CORROSION:       ((150, 78, 42), "patch", (0.5, 1.6), 0.05),
    DefectType.COATING_LOSS:    ((200, 172, 132), "patch", (0.5, 1.3), 0.0),
    DefectType.CRACK:           ((26, 22, 20), "line", (0.5, 2.2), 0.0),
    DefectType.LEAK:            ((34, 28, 24), "streak", (0.5, 1.6), 0.15),
    DefectType.DEFORMATION:     ((96, 96, 102), "blob", (0.8, 2.2), 0.0),
    DefectType.THERMAL_ANOMALY: ((255, 140, 50), "blob", (0.4, 1.2), 0.85),
}

# Radar-return anomaly per type: structural changes (deformation) and hot-spots
# scatter strongly; thin discolouration (corrosion/coating) barely. This is why
# the high-altitude SAR pass earns the deformation defects mono-EO cannot see.
_SAR = {
    DefectType.CORROSION: 0.20, DefectType.COATING_LOSS: 0.12, DefectType.CRACK: 0.30,
    DefectType.LEAK: 0.32, DefectType.DEFORMATION: 0.90, DefectType.THERMAL_ANOMALY: 0.92,
}

# Plausible defect types per structure kind.
_KIND_TYPES = {
    "tank":      [DefectType.CORROSION, DefectType.COATING_LOSS, DefectType.LEAK, DefectType.DEFORMATION],
    "tower":     [DefectType.CORROSION, DefectType.CRACK, DefectType.COATING_LOSS],
    "sphere":    [DefectType.CORROSION, DefectType.COATING_LOSS, DefectType.LEAK],
    "pipe_rack": [DefectType.CORROSION, DefectType.LEAK, DefectType.THERMAL_ANOMALY],
    "flare":     [DefectType.THERMAL_ANOMALY, DefectType.CORROSION, DefectType.CRACK],
}


def _pick_type(kind: str, rng: np.random.Generator) -> DefectType:
    opts = _KIND_TYPES.get(kind, list(_APPEARANCE))
    return opts[int(rng.integers(0, len(opts)))]


def inject_defects(refinery: Refinery, seed: int = 0, count: int = 14,
                   per_structure_max: int = 2) -> list[Defect]:
    """Place ``count`` defects across the asset's structures, deterministically."""
    rng = np.random.default_rng([seed, 0xDEFEC7])
    structures = refinery.structures
    # weight larger structures (more surface) higher
    weights = np.array([max(s.radius * s.height, 4.0) for s in structures], float)
    weights /= weights.sum()

    defects: list[Defect] = []
    per_struct: dict[int, int] = {}
    did = 0
    attempts = 0
    while len(defects) < count and attempts < count * 20:
        attempts += 1
        s: Structure = structures[int(rng.choice(len(structures), p=weights))]
        if per_struct.get(s.id, 0) >= per_structure_max:
            continue
        (pt, nrm) = s.surface_points(1, rng)[0]
        dtype = _pick_type(s.kind, rng)
        color, shape, (smin, smax), base_thermal = _APPEARANCE[dtype]
        severity = float(rng.uniform(0.35, 1.0))
        size = float(rng.uniform(smin, smax)) * (0.6 + 0.4 * severity)
        # leaks run downward; force normal-tangential streak handled in renderer
        thermal = min(1.0, base_thermal + (0.3 * severity if dtype == DefectType.THERMAL_ANOMALY else 0.0))
        did += 1
        per_struct[s.id] = per_struct.get(s.id, 0) + 1
        sar = min(1.0, _SAR[dtype] * (0.55 + 0.45 * severity))
        defects.append(Defect(
            id=did, structure_id=s.id, defect_type=dtype,
            position=pt, normal=nrm, size_m=size, severity=severity,
            color=color, shape=shape, thermal=thermal, sar_signature=sar))
    return defects
