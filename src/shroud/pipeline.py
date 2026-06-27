"""End-to-end SHROUD run: inspect -> tokenise -> cooperatively validate -> verify.

Ties every element together against a real EVM (local eth-tester by default, or
live Avalanche Fuji): a UAV fleet cooperatively inspects the refinery (real
renders + real CV), each first-detected defect is tokenised on-chain by its
reporter UAV (EIP-712 signed), other UAVs are tasked to independently re-inspect
it, and >=3 distinct recognisers promote it to VERIFIED. Finally the operator
drives one failure through IN_MAINTENANCE -> SOLVED.

Deterministic given the seed; writes a recording JSON the dashboard can replay.
"""

from __future__ import annotations

import json
import math
import os
from dataclasses import dataclass, field

import numpy as np

from .chain.client import ShroudChain
from .chain.identities import uav_signers
from .core.messages import AltitudeClass, CameraPose, DefectType, FailureState
from .coord.allocation import assign_coverage, select_validators
from .fleet import Uav
from .sensors.camera import inspect
from .sim.defects import inject_defects
from .sim.infrastructure import build_procedural_refinery

_ASSOC_RADIUS = 4.0   # m: detections within this of a candidate are the same defect


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
    failure_id: int = -1
    state: FailureState = FailureState.IDENTIFIED
    recognisers: set = field(default_factory=set)   # uav_ids


def _rot_z(v, ang):
    c, s = math.cos(ang), math.sin(ang)
    return np.array([c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]])


def _reinspect_pose(structure, point, uav, az_offset, standoff=14.0):
    n = structure.outward_normal(point)
    n = _rot_z(n, az_offset)
    eye = np.asarray(point, float) + n * standoff + np.array([0, 0, 1.0])
    eye[2] = max(eye[2], 3.0)
    return CameraPose(eye=eye, target=np.asarray(point, float).copy(), fov_deg=44)


def _build_fleet(refinery, signers, n_uavs):
    xmin, ymin, xmax, ymax = refinery.bounds
    uavs = []
    for i, (uid, sg) in enumerate(list(signers.items())[:n_uavs]):
        ang = 2 * math.pi * i / n_uavs
        cx, cy = refinery.center[:2]
        home = np.array([cx + (xmax - xmin) * 0.55 * math.cos(ang),
                         cy + (ymax - ymin) * 0.55 * math.sin(ang), 20.0])
        uavs.append(Uav(uid, sg, home, AltitudeClass.LOW))
    return uavs


def run_demo(network: str = "local", seed: int = 0, n_uavs: int = 6,
             illumination: float = 1.0, quick: bool = True,
             out_dir: str = "runs", log=print) -> dict:
    os.makedirs(out_dir, exist_ok=True)
    crop_dir = os.path.join(out_dir, "crops")

    # --- world ---
    refinery = build_procedural_refinery(seed)
    defects = inject_defects(refinery, seed, count=14)
    from .render.renderer import Renderer
    renderer = Renderer(refinery, defects, width=512, height=384)

    # --- chain ---
    log(f"[chain] connecting ({network}) ...")
    if network == "fuji":
        from dotenv import load_dotenv
        from pathlib import Path
        load_dotenv(Path(__file__).resolve().parents[2] / ".env")
        rpc = os.getenv("FUJI_RPC_URL")
        pk = os.getenv("DEPLOYER_PRIVATE_KEY", "")
        chain = ShroudChain.remote(rpc, pk)
        bal = chain.w3.eth.get_balance(chain.deployer_address)
        log(f"[chain] deployer {chain.deployer_address} balance {bal/1e18:.4f} AVAX")
        if bal == 0:
            raise SystemExit("Fund the deployer on Fuji first (scripts/fund_check.py).")
    else:
        chain = ShroudChain.local(seed=seed)
    address = chain.deploy()
    log(f"[chain] ShroudRegistry @ {address} (chainId {chain.chain_id})")

    # --- registry: buildings + UAV signer set ---
    sid_to_bid = {}
    for s in refinery.structures:
        bid = chain.register_building(s.name, s.kind, s.geo_hash())
        sid_to_bid[s.id] = bid
    signers = uav_signers(seed, [f"uav-{i+1}" for i in range(n_uavs)])
    chain.register_uavs([sg.address for sg in signers.values()])
    fleet = _build_fleet(refinery, signers, n_uavs)
    fleet_by_id = {u.uav_id: u for u in fleet}
    log(f"[registry] {len(sid_to_bid)} structures, {n_uavs} UAVs registered on-chain")

    # ============================ DISCOVERY ============================
    coverage = assign_coverage(refinery.structures, fleet)
    vp_kw = {"n_az": 6, "height_fracs": (0.5,)} if quick else {}
    candidates: list[Candidate] = []
    events: list[dict] = []
    cand_seq = 0
    n_inspections = 0
    log("\n[discovery] cooperative coverage sweep ...")
    for uav in fleet:
        for sid in coverage[uav.uav_id]:
            s = refinery.by_id(sid)
            for vp in s.inspection_viewpoints(**vp_kw):
                n_inspections += 1
                for det in inspect(renderer, vp, s, uav.uav_id, 0.0, crop_dir,
                                   illumination=illumination):
                    # associate to an existing candidate on this structure
                    match = None
                    for c in candidates:
                        if c.structure_id == sid and np.linalg.norm(
                                c.position - det.position) < _ASSOC_RADIUS:
                            match = c
                            break
                    if match is None:
                        cand_seq += 1
                        c = Candidate(cand_seq, sid, det.defect_type, det.position,
                                      det.confidence, det.image_sha256, det.image_path,
                                      uav.uav_id)
                        c.recognisers.add(uav.uav_id)
                        # tokenise on-chain (reporter-signed EIP-712 identify)
                        x, y, z = (int(round(v * 1000)) for v in det.position)
                        fid = chain.identify_failure(
                            sid_to_bid[sid], int(det.defect_type), x, y, z,
                            bytes.fromhex(det.image_sha256), det.image_path, uav.signer)
                        c.failure_id = fid
                        candidates.append(c)
                        events.append({"kind": "identified", "failure_id": fid,
                                       "structure": s.name, "type": det.defect_type.name,
                                       "reporter": uav.uav_id})
                        log(f"  + {uav.uav_id} identified failure #{fid}: "
                            f"{det.defect_type.name} on {s.name} (conf {det.confidence:.2f})")
    log(f"[discovery] {n_inspections} inspections -> {len(candidates)} candidate failures tokenised")

    # ========================= COOPERATIVE VALIDATION =========================
    log("\n[validation] tasking other UAVs to independently re-inspect ...")
    verified = 0
    for c in candidates:
        s = refinery.by_id(c.structure_id)
        excluded = set(c.recognisers)
        validators = select_validators(c.position, fleet, k=4, exclude=excluded)
        for vi, u in enumerate(validators):
            az = math.radians((-1) ** vi * (8 + 7 * (vi // 2)))   # distinct angles
            pose = _reinspect_pose(s, c.position, u, az)
            dets = inspect(renderer, pose, s, u.uav_id, 1.0, crop_dir, illumination=illumination)
            seen = [d for d in dets if np.linalg.norm(d.position - c.position) < _ASSOC_RADIUS]
            if not seen:
                continue
            conf = int(min(100, max(1, round(max(d.confidence for d in seen) * 100))))
            res = chain.submit_confirmation(c.failure_id, True, conf, u.signer)
            c.recognisers.add(u.uav_id)
            events.append({"kind": "confirmed", "failure_id": c.failure_id, "uav": u.uav_id})
            log(f"  ~ {u.uav_id} confirmed failure #{c.failure_id} "
                f"({len(c.recognisers)} recognisers)")
            if res["verified"]:
                c.state = FailureState.VERIFIED
                verified += 1
                events.append({"kind": "verified", "failure_id": c.failure_id})
                log(f"  = failure #{c.failure_id} VERIFIED ({s.name})")
                break
    log(f"[validation] {verified}/{len(candidates)} candidates verified by >=3 UAVs")

    # ============================ OPERATOR LIFECYCLE ============================
    verified_cands = [c for c in candidates if c.state == FailureState.VERIFIED]
    if verified_cands:
        c = verified_cands[0]
        log(f"\n[operator] driving failure #{c.failure_id} lifecycle ...")
        chain.set_state(c.failure_id, int(FailureState.IN_MAINTENANCE))
        chain.set_state(c.failure_id, int(FailureState.SOLVED))
        c.state = FailureState.SOLVED
        events.append({"kind": "lifecycle", "failure_id": c.failure_id, "to": "SOLVED"})
        log(f"  failure #{c.failure_id}: VERIFIED -> IN_MAINTENANCE -> SOLVED")

    # ---- refresh on-chain truth + recording ----
    for c in candidates:
        c.state = FailureState(chain.failure_state(c.failure_id))
    counts = chain.counts()
    truth_found = {d.id for d in defects if d.found_by}
    summary = {
        "network": network, "contract": address, "chainId": chain.chain_id,
        "structures": len(refinery.structures), "uavs": n_uavs,
        "defects_truth": len(defects), "candidates": len(candidates),
        "verified": sum(c.state in (FailureState.VERIFIED, FailureState.IN_MAINTENANCE,
                                    FailureState.SOLVED) for c in candidates),
        "solved": sum(c.state == FailureState.SOLVED for c in candidates),
        "chain_counts": counts,
    }
    recording = {
        "asset": refinery.manifest(),
        "uavs": [{"id": u.uav_id, "home": u.home.tolist(), "address": u.address}
                 for u in fleet],
        "defects_truth": [{"id": d.id, "type": d.defect_type.name,
                           "structure_id": d.structure_id,
                           "position": np.round(d.position, 2).tolist()} for d in defects],
        "candidates": [{"cand_id": c.cand_id, "failure_id": c.failure_id,
                        "structure_id": c.structure_id, "type": c.defect_type.name,
                        "position": np.round(c.position, 2).tolist(),
                        "confidence": round(c.confidence, 2), "reporter": c.reporter,
                        "recognisers": sorted(c.recognisers), "state": c.state.name,
                        "image_sha256": c.image_sha256,
                        "image_path": os.path.relpath(c.image_path, out_dir)
                        if c.image_path else ""} for c in candidates],
        "events": events, "summary": summary,
    }
    rec_path = os.path.join(out_dir, "demo.json")
    with open(rec_path, "w") as f:
        json.dump(recording, f, indent=2)
    renderer.close()

    log("\n================= SHROUD run summary =================")
    log(f"  contract      : {address}  (chainId {chain.chain_id}, {network})")
    log(f"  structures    : {summary['structures']} on-chain buildings")
    log(f"  ground-truth  : {summary['defects_truth']} defects")
    log(f"  identified    : {summary['candidates']} failure tokens minted")
    log(f"  verified (>=3): {summary['verified']}")
    log(f"  solved        : {summary['solved']}")
    log(f"  recording     : {rec_path}")
    log("=====================================================")
    return summary
