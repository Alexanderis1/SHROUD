"""Typed messages exchanged over the bus — the future ROS 2 ``.msg`` files.

Everything a SHROUD node emits or consumes is one of these dataclasses. Field
names and the integer enum values (``DefectType``, ``FailureState``) are part
of the contract: the Solidity ``ShroudRegistry`` mirrors the same enums, and
the dashboard reads the same field names off the recording.

Adapted in spirit from COOP-UAV-S ``core/messages.py`` (header + per-run
sequence reset for determinism), but the message set is SHROUD's own.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, IntEnum

import numpy as np

# ---------------------------------------------------------------------------
# Per-run message sequence (reset by World so run N reproduces a standalone
# run of the same seed).
# ---------------------------------------------------------------------------
_SEQ = 0


def reset_message_seq() -> None:
    global _SEQ
    _SEQ = 0


def next_seq() -> int:
    global _SEQ
    _SEQ += 1
    return _SEQ


@dataclass
class Header:
    stamp: float = 0.0
    frame_id: str = "map"
    seq: int = field(default_factory=next_seq)


# ---------------------------------------------------------------------------
# Enums — integer values are the on-chain contract too (uint8).
# ---------------------------------------------------------------------------
class DefectType(IntEnum):
    UNKNOWN = 0
    CORROSION = 1          # rust / oxidation on steel tanks & pipe racks
    CRACK = 2              # concrete / weld cracking
    LEAK = 3              # liquid stain / hydrocarbon seep
    COATING_LOSS = 4       # paint / insulation spalling
    DEFORMATION = 5        # dent / buckle / settlement
    THERMAL_ANOMALY = 6    # hot-spot (SAR/IR cue, e.g. flare, bearing)


class SensorModality(Enum):
    EO = "eo"              # low-altitude visible camera
    IR = "ir"              # thermal
    SAR = "sar"            # high-altitude synthetic-aperture radar


class AltitudeClass(Enum):
    LOW = "low"
    HIGH = "high"


class UavMode(Enum):
    IDLE = "idle"
    TRANSIT = "transit"     # flying to an assigned viewpoint / structure
    INSPECT = "inspect"     # running CV/SAR coverage of a structure
    REVALIDATE = "revalidate"  # re-inspecting a candidate failure to confirm
    RTB = "rtb"             # return to base (low battery / mission end)
    CHARGE = "charge"       # docked at a charging station


class FailureState(IntEnum):
    """Mirrors the on-chain failure lifecycle (ShroudRegistry.State)."""
    NONE = 0
    IDENTIFIED = 1          # a single UAV tokenised a candidate
    VERIFIED = 2            # >= QUORUM distinct UAVs independently confirmed
    IN_MAINTENANCE = 3      # client/operator dispatched a crew
    SOLVED = 4              # repair complete
    FALSE_POSITIVE = 5      # dismissed (failed validation / operator reject)


# ---------------------------------------------------------------------------
# Geometry
# ---------------------------------------------------------------------------
@dataclass
class CameraPose:
    """A look-at camera pose used both to fly the UAV and to render."""
    eye: np.ndarray = field(default_factory=lambda: np.zeros(3))      # world position
    target: np.ndarray = field(default_factory=lambda: np.zeros(3))   # look-at point
    up: np.ndarray = field(default_factory=lambda: np.array([0.0, 0.0, 1.0]))
    fov_deg: float = 50.0

    def forward(self) -> np.ndarray:
        d = np.asarray(self.target, float) - np.asarray(self.eye, float)
        n = float(np.linalg.norm(d))
        return d / n if n > 1e-9 else np.array([1.0, 0.0, 0.0])


# ---------------------------------------------------------------------------
# Sensor output
# ---------------------------------------------------------------------------
@dataclass
class DefectDetection:
    """One CV/SAR hit from one UAV at one viewpoint — the sim-side sensor's
    only output. Carries the genuine rendered image crop (path + sha256) that
    gets tokenised, plus the geometry that produced it."""
    header: Header
    uav_id: str
    modality: SensorModality
    structure_id: int                 # which infrastructure structure (building)
    defect_type: DefectType
    confidence: float                 # CV detector score in [0,1]
    position: np.ndarray              # estimated 3D world position of the defect
    bbox: tuple[int, int, int, int]   # (x, y, w, h) in the image crop
    image_path: str                   # path to the rendered RGB (or SAR) crop
    image_sha256: str                 # hash of the image bytes (tokenised on-chain)
    pose: CameraPose                  # the viewpoint that observed it
    range_m: float = 0.0
    incidence_deg: float = 0.0        # angle between view ray and surface normal
    illumination: float = 1.0         # 0..1 scene illumination at observation
    truth_id: int = -1                # sim-side ground-truth defect id (eval only)


# ---------------------------------------------------------------------------
# Fleet
# ---------------------------------------------------------------------------
@dataclass
class UavState:
    header: Header
    uav_id: str
    position: np.ndarray
    velocity: np.ndarray
    heading: float
    mode: UavMode
    altitude_class: AltitudeClass
    battery_frac: float = 1.0
    task_id: str = ""
    address: str = ""                 # the UAV's on-chain signer address


# ---------------------------------------------------------------------------
# C2 tasking
# ---------------------------------------------------------------------------
@dataclass
class InspectionTask:
    """A coverage assignment: visit an ordered list of viewpoints (a route
    produced by the cooperative allocator) covering one or more structures."""
    task_id: str
    uav_id: str
    structure_ids: list[int]
    viewpoints: list[CameraPose]
    priority: float = 1.0
    kind: str = "coverage"            # "coverage" | "structure" | "viewpoint"


@dataclass
class ValidationTask:
    """A re-inspection assignment: go look at an already-tokenised candidate
    failure and independently decide whether it is real."""
    task_id: str
    uav_id: str
    failure_id: int                   # on-chain token id
    structure_id: int
    target_position: np.ndarray
    viewpoint: CameraPose
    expiry_t: float = 1e9


@dataclass
class UavConfirmation:
    """A UAV's independent verdict on a candidate, EIP-712 signed with the
    UAV's own key. The relayer submits these; the contract recovers the signer
    and counts distinct UAV addresses toward the verification quorum."""
    failure_id: int
    uav_id: str
    uav_address: str
    verdict: bool                     # True = "I also see a real defect here"
    confidence: float
    digest_hex: str                   # EIP-712 digest that was signed
    signature_hex: str                # 65-byte secp256k1 signature


# ---------------------------------------------------------------------------
# Fusion / shared world picture (C2 side)
# ---------------------------------------------------------------------------
@dataclass
class CandidateDefect:
    """The C2's fused belief about one physical defect, built from one or more
    detections. ``failure_id`` is set once it is tokenised on-chain."""
    cand_id: int
    structure_id: int
    defect_type: DefectType
    position: np.ndarray
    confidence: float
    observers: set[str] = field(default_factory=set)   # distinct uav_ids
    n_observations: int = 0
    state: FailureState = FailureState.NONE
    failure_id: int = -1               # on-chain token id (once minted)
    image_sha256: str = ""
    image_path: str = ""
    first_seen_t: float = 0.0
    last_seen_t: float = 0.0
    truth_id: int = -1


# ---------------------------------------------------------------------------
# Chain bridge -> dashboard / recorder
# ---------------------------------------------------------------------------
@dataclass
class ChainEvent:
    kind: str                          # "FailureIdentified" | "FailureVerified" | "StateChanged"
    failure_id: int
    building_id: int = -1
    state: FailureState = FailureState.NONE
    tx_hash: str = ""
    block: int = 0
    extra: dict = field(default_factory=dict)


# Topic name constants (the ROS 2 topic graph).
TOPIC_DETECTIONS = "defect/detections"
TOPIC_UAV_STATE = "uav/state"
TOPIC_INSPECT_TASKS = "inspect/tasks"
TOPIC_VALIDATE_TASKS = "validate/tasks"
TOPIC_CONFIRMATION = "validate/confirmation"
TOPIC_CANDIDATES = "defect/candidates"
TOPIC_CHAIN_EVENT = "chain/event"
TOPIC_COVERAGE = "coverage/state"
