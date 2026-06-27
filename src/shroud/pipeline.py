"""End-to-end SHROUD run: inspect -> tokenise -> cooperatively validate -> verify.

Ties every element together against a real EVM (local eth-tester by default, or
live Avalanche Fuji):

  Phase 0  high-altitude SAR sweep   -> finds deformation / hot-spot defects
                                         (illumination-independent) that mono-EO
                                         cannot see, and tokenises them.
  Phase 1  low-altitude EO coverage  -> cooperative graph-allocated inspection;
                                         tokenises EO-visible defects, and EO/SAR
                                         cross-confirm overlapping finds.
  Phase 2  cooperative validation    -> other UAVs (EO or SAR, by altitude) are
                                         tasked to re-inspect each candidate;
                                         >=3 distinct recognisers => VERIFIED.
  Phase 3  operator lifecycle        -> VERIFIED -> IN_MAINTENANCE -> SOLVED.

Deterministic given the seed; writes a recording JSON the console replays.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass, field

import numpy as np

from .chain.client import ShroudChain
from .chain.identities import uav_signers
from .core.messages import (AltitudeClass, CameraPose, DefectType, FailureState,
                            SensorModality)
from .coord.allocation import assign_coverage, select_validators
from .fleet import Uav
from .sensors.camera import inspect
from .sensors.sar import inspect_sar
from .sim.defects import inject_defects
from .sim.infrastructure import build_procedural_refinery

_ASSOC = 4.5   # m: detections within this of a candidate are the same defect
QUORUM = 3


@dataclass
class Candidate:
    cand_id: int
    structure_id: int
    defect_type: DefectType
    position: np.ndarray
    confidence: float
    image_sha256: str
    image_path: str
    reporter: str
    modality: str
    failure_id: int = -1
    state: FailureState = FailureState.IDENTIFIED
    recognisers: set = field(default_factory=set)


def _rot_z(v, ang):
    c, s = math.cos(ang), math.sin(ang)
    return np.array([c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]])


def _eo_pose(structure, point, az_offset, standoff=14.0):
    n = _rot_z(structure.outward_normal(point), az_offset)
    eye = np.asarray(point, float) + n * standoff + np.array([0, 0, 1.0])
    eye[2] = max(eye[2], 3.0)
    return CameraPose(eye=eye, target=np.asarray(point, float).copy(), fov_deg=44)


def _sar_pose(point, az, horiz=62.0, height=95.0):
    """Oblique high-altitude side-look (real SAR geometry sees vertical walls)."""
    off = _rot_z(np.array([1.0, 0.0, 0.0]), az) * horiz
    eye = np.asarray(point, float) + off + np.array([0, 0, height])
    return CameraPose(eye=eye, target=np.asarray(point, float).copy(), fov_deg=52)


def _build_fleet(refinery, signers, n_low, n_high):
    xmin, ymin, xmax, ymax = refinery.bounds
    cx, cy = refinery.center[:2]
    ids = list(signers)
    low, high = [], []
    for i in range(n_low):
        ang = 2 * math.pi * i / n_low
        home = np.array([cx + (xmax - xmin) * 0.55 * math.cos(ang),
                         cy + (ymax - ymin) * 0.55 * math.sin(ang), 22.0])
        low.append(Uav(ids[i], signers[ids[i]], home, AltitudeClass.LOW))
    for j in range(n_high):
        ang = 2 * math.pi * j / max(1, n_high) + 0.5
        home = np.array([cx + (xmax - xmin) * 0.7 * math.cos(ang),
                         cy + (ymax - ymin) * 0.7 * math.sin(ang), 95.0])
        high.append(Uav(ids[n_low + j], signers[ids[n_low + j]], home, AltitudeClass.HIGH))
    return low, high


def run_demo(network: str = "local", seed: int = 0, n_uavs: int = 6, n_high: int = 3,
             illumination: float = 1.0, quick: bool = True,
             out_dir: str = "runs", log=print) -> dict:
    os.makedirs(out_dir, exist_ok=True)
    crop_dir = os.path.join(out_dir, "crops")

    refinery = build_procedural_refinery(seed)
    defects = inject_defects(refinery, seed, count=14)
    from .render.renderer import Renderer
    renderer = Renderer(refinery, defects, width=512, height=384)

    # --- chain ---
    log(f"[chain] connecting ({network}) ...")
    if network == "fuji":
        from pathlib import Path

        from dotenv import load_dotenv
        load_dotenv(Path(__file__).resolve().parents[2] / ".env")
        chain = ShroudChain.remote(os.getenv("FUJI_RPC_URL"), os.getenv("DEPLOYER_PRIVATE_KEY", ""))
        bal = chain.w3.eth.get_balance(chain.deployer_address)
        log(f"[chain] deployer {chain.deployer_address} balance {bal/1e18:.4f} AVAX")
        if bal == 0:
            raise SystemExit("Fund the deployer on Fuji first (scripts/fund_check.py).")
    else:
        chain = ShroudChain.local(seed=seed)
    address = chain.deploy()
    log(f"[chain] ShroudRegistry @ {address} (chainId {chain.chain_id})")

    # --- registry: buildings + UAV signer set ---
    sid_to_bid = {s.id: chain.register_building(s.name, s.kind, s.geo_hash())
                  for s in refinery.structures}
    ids = [f"uav-{i+1}" for i in range(n_uavs + n_high)]
    signers = uav_signers(seed, ids)
    chain.register_uavs([sg.address for sg in signers.values()])
    low_fleet, high_fleet = _build_fleet(refinery, signers, n_uavs, n_high)
    fleet = low_fleet + high_fleet
    log(f"[registry] {len(sid_to_bid)} structures, {n_uavs} EO + {n_high} SAR UAVs on-chain")

    candidates: list[Candidate] = []
    events: list[dict] = []
    by_struct: dict[int, list[Candidate]] = {}
    seq = [0]

    def observe(uav, det) -> None:
        """Create / cross-confirm a candidate from a detection (uniform across
        SAR sweep, EO coverage and validation)."""
        for c in by_struct.get(det.structure_id, []):
            if np.linalg.norm(c.position - det.position) < _ASSOC:
                if uav.uav_id in c.recognisers or c.state != FailureState.IDENTIFIED:
                    return
                conf = int(min(100, max(1, round(det.confidence * 100))))
                res = chain.submit_confirmation(c.failure_id, True, conf, uav.signer)
                c.recognisers.add(uav.uav_id)
                events.append({"kind": "confirmed", "failure_id": c.failure_id, "uav": uav.uav_id})
                log(f"  ~ {uav.uav_id} confirmed failure #{c.failure_id} "
                    f"({len(c.recognisers)} recognisers)")
                if res["verified"]:
                    c.state = FailureState.VERIFIED
                    events.append({"kind": "verified", "failure_id": c.failure_id})
                    log(f"  = failure #{c.failure_id} VERIFIED")
                return
        # new candidate -> tokenise (reporter-signed identify)
        seq[0] += 1
        x, y, z = (int(round(v * 1000)) for v in det.position)
        fid = chain.identify_failure(sid_to_bid[det.structure_id], int(det.defect_type),
                                     x, y, z, bytes.fromhex(det.image_sha256),
                                     det.image_path, uav.signer)
        c = Candidate(seq[0], det.structure_id, det.defect_type, det.position,
                      det.confidence, det.image_sha256, det.image_path, uav.uav_id,
                      det.modality.value, fid)
        c.recognisers.add(uav.uav_id)
        candidates.append(c)
        by_struct.setdefault(det.structure_id, []).append(c)
        events.append({"kind": "identified", "failure_id": fid,
                       "structure": refinery.by_id(det.structure_id).name,
                       "type": det.defect_type.name, "reporter": uav.uav_id,
                       "modality": det.modality.value})
        log(f"  + {uav.uav_id} identified failure #{fid}: {det.defect_type.name} on "
            f"{refinery.by_id(det.structure_id).name} [{det.modality.value}] (conf {det.confidence:.2f})")

    # ===================== PHASE 0: high-altitude SAR sweep =====================
    log("\n[SAR] high-altitude radar sweep (illumination-independent) ...")
    sar_assign = assign_coverage(refinery.structures, high_fleet) if high_fleet else {}
    for u in high_fleet:
        for k, sid in enumerate(sar_assign.get(u.uav_id, [])):
            s = refinery.by_id(sid)
            pose = _sar_pose(s.axis_point(0.5), az=math.radians(40 + 80 * (k % 3)))
            for det in inspect_sar(renderer, pose, refinery, defects, u.uav_id, 0.0, crop_dir, seed):
                observe(u, det)
    log(f"[SAR] {sum(c.modality=='sar' for c in candidates)} SAR-origin candidates")

    # ===================== PHASE 1: low-altitude EO coverage =====================
    log("\n[EO] cooperative coverage sweep ...")
    coverage = assign_coverage(refinery.structures, low_fleet)
    vp_kw = {"n_az": 6, "height_fracs": (0.5,)} if quick else {}
    n_insp = 0
    for u in low_fleet:
        for sid in coverage[u.uav_id]:
            s = refinery.by_id(sid)
            for vp in s.inspection_viewpoints(**vp_kw):
                n_insp += 1
                for det in inspect(renderer, vp, s, u.uav_id, 0.0, crop_dir, illumination=illumination):
                    observe(u, det)
    log(f"[EO] {n_insp} inspections -> {len(candidates)} total candidate failures")

    # ===================== PHASE 2: cooperative validation =====================
    log("\n[validation] tasking other UAVs to independently re-inspect ...")
    for c in candidates:
        s = refinery.by_id(c.structure_id)
        rounds = 0
        while c.state == FailureState.IDENTIFIED and rounds < 1:
            rounds += 1
            for vi, u in enumerate(select_validators(c.position, fleet, k=6, exclude=c.recognisers)):
                if u.altitude_class == AltitudeClass.HIGH:
                    pose = _sar_pose(c.position, az=math.radians(30 + 60 * vi))
                    dets = inspect_sar(renderer, pose, refinery, defects, u.uav_id, 1.0, crop_dir, seed)
                else:
                    pose = _eo_pose(s, c.position, math.radians((-1) ** vi * (8 + 7 * (vi // 2))))
                    dets = inspect(renderer, pose, s, u.uav_id, 1.0, crop_dir, illumination=illumination)
                if any(np.linalg.norm(d.position - c.position) < _ASSOC for d in dets):
                    observe(u, [d for d in dets if np.linalg.norm(d.position - c.position) < _ASSOC][0])
                if c.state != FailureState.IDENTIFIED:
                    break
    verified = sum(c.state == FailureState.VERIFIED for c in candidates)
    log(f"[validation] {verified}/{len(candidates)} candidates verified by >=3 UAVs")

    # ===================== PHASE 3: operator lifecycle =====================
    vc = [c for c in candidates if c.state == FailureState.VERIFIED]
    if vc:
        c = vc[0]
        log(f"\n[operator] driving failure #{c.failure_id} lifecycle ...")
        chain.set_state(c.failure_id, int(FailureState.IN_MAINTENANCE))
        chain.set_state(c.failure_id, int(FailureState.SOLVED))
        events.append({"kind": "lifecycle", "failure_id": c.failure_id, "to": "SOLVED"})
        log(f"  failure #{c.failure_id}: VERIFIED -> IN_MAINTENANCE -> SOLVED")

    for c in candidates:
        c.state = FailureState(chain.failure_state(c.failure_id))
    counts = chain.counts()
    summary = {
        "network": network, "contract": address, "chainId": chain.chain_id,
        "structures": len(refinery.structures), "uavs": n_uavs + n_high,
        "uavs_eo": n_uavs, "uavs_sar": n_high,
        "defects_truth": len(defects), "candidates": len(candidates),
        "sar_finds": sum(c.modality == "sar" for c in candidates),
        "verified": sum(c.state in (FailureState.VERIFIED, FailureState.IN_MAINTENANCE,
                                    FailureState.SOLVED) for c in candidates),
        "solved": sum(c.state == FailureState.SOLVED for c in candidates),
        "chain_counts": counts,
    }
    recording = {
        "asset": refinery.manifest(),
        "uavs": [{"id": u.uav_id, "home": u.home.tolist(), "address": u.address,
                  "altitude": u.altitude_class.value} for u in fleet],
        "defects_truth": [{"id": d.id, "type": d.defect_type.name, "structure_id": d.structure_id,
                           "position": np.round(d.position, 2).tolist()} for d in defects],
        "candidates": [{"cand_id": c.cand_id, "failure_id": c.failure_id,
                        "structure_id": c.structure_id, "type": c.defect_type.name,
                        "position": np.round(c.position, 2).tolist(),
                        "confidence": round(c.confidence, 2), "reporter": c.reporter,
                        "modality": c.modality, "recognisers": sorted(c.recognisers),
                        "state": c.state.name, "image_sha256": c.image_sha256,
                        "image_path": os.path.relpath(c.image_path, out_dir) if c.image_path else ""}
                       for c in candidates],
        "events": events, "summary": summary,
    }
    with open(os.path.join(out_dir, "demo.json"), "w") as f:
        json.dump(recording, f, indent=2)
    renderer.close()

    log("\n================= SHROUD run summary =================")
    log(f"  contract      : {address}  (chainId {chain.chain_id}, {network})")
    log(f"  structures    : {summary['structures']} on-chain buildings")
    log(f"  fleet         : {n_uavs} EO + {n_high} SAR UAVs")
    log(f"  ground-truth  : {summary['defects_truth']} defects")
    log(f"  identified    : {summary['candidates']} tokens  ({summary['sar_finds']} via SAR)")
    log(f"  verified (>=3): {summary['verified']}")
    log(f"  solved        : {summary['solved']}")
    log(f"  recording     : {os.path.join(out_dir, 'demo.json')}")
    log("=====================================================")
    return summary
