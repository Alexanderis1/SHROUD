"""Cinematic fly-through: the UAV fleet cooperatively inspecting the refinery.

Animated quadrotors fly their assigned routes; a failure marker pops when a UAV
passes over a defect (identified), then turns red once >=3 UAVs have validated
it (per the on-chain recording). Writes runs/shroud_flight.mp4.
"""

from __future__ import annotations

import json
import math
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from shroud.chain.identities import uav_signers                  # noqa: E402
from shroud.coord.allocation import assign_coverage              # noqa: E402
from shroud.core.messages import AltitudeClass, CameraPose       # noqa: E402
from shroud.fleet import Uav                                     # noqa: E402
from shroud.render.camera import project                         # noqa: E402
from shroud.render.drones import DRONE_COLORS, plan_routes, route_pose  # noqa: E402
from shroud.sim.defects import inject_defects                    # noqa: E402
from shroud.sim.infrastructure import build_procedural_refinery  # noqa: E402

W, H, FPS = 1280, 720, 30
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RUNS = os.path.join(REPO, "runs")


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * t)


def build_fleet(refinery, n):
    signers = uav_signers(0, [f"uav-{i+1}" for i in range(n)])
    xmin, ymin, xmax, ymax = refinery.bounds
    fleet = []
    for i, (uid, sg) in enumerate(signers.items()):
        ang = 2 * math.pi * i / n
        cx, cy = refinery.center[:2]
        home = np.array([cx + (xmax - xmin) * 0.55 * math.cos(ang),
                         cy + (ymax - ymin) * 0.55 * math.sin(ang), 24.0])
        fleet.append(Uav(uid, sg, home, AltitudeClass.LOW))
    return fleet


def main():
    rec_path = os.path.join(RUNS, "demo.json")
    if not os.path.exists(rec_path):
        from shroud.pipeline import run_demo
        run_demo(network="local", out_dir=RUNS, log=lambda *a, **k: None)
    rec = json.load(open(rec_path))
    cands = rec["candidates"]

    ref = build_procedural_refinery(0)
    defs = inject_defects(ref, 0, 14)
    from shroud.render.renderer import Renderer
    r = Renderer(ref, defs, W, H)
    n = len(rec["uavs"])
    fleet = build_fleet(ref, n)
    cov = assign_coverage(ref.structures, fleet)
    routes = plan_routes(ref, cov, fleet)
    r.add_drones(DRONE_COLORS[:n])

    out = os.path.join(RUNS, "shroud_flight.mp4")
    vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W, H))
    center = ref.center

    NF = 460
    revealed = {}      # cand_id -> frame revealed
    verified_at = {}   # cand_id -> frame turned red
    drone_pos = [None] * n
    for f in range(NF):
        prog = f / NF
        # drones along routes (~1.6 loops over the clip)
        for i, u in enumerate(fleet):
            pos, yaw = route_pose(routes[u.uav_id], 1.6 * prog + 0.13 * i)
            drone_pos[i] = pos
            r.set_drone(i, pos, yaw)
        # camera: slow orbit, easing, descending a little
        a = math.radians(40) + 2 * math.pi * ease(prog) * 0.7
        height = 150 - 35 * ease(prog)
        eye = center + np.array([205 * math.cos(a), 205 * math.sin(a), height])
        pose = CameraPose(eye=eye, target=center + np.array([0, 0, 18.0]), fov_deg=56)
        img = cv2.cvtColor(r.render(pose), cv2.COLOR_RGB2BGR)

        # discovery: reveal a marker when a UAV passes over its defect
        for c in cands:
            cid = c["cand_id"]
            cp = np.array(c["position"])
            if cid not in revealed:
                if min(np.linalg.norm(np.array(d) - cp) for d in drone_pos) < 30.0:
                    revealed[cid] = f
            elif cid not in verified_at and (f - revealed[cid]) > 55 and \
                    c["state"] in ("VERIFIED", "IN_MAINTENANCE", "SOLVED"):
                verified_at[cid] = f

        # draw markers
        for c in cands:
            cid = c["cand_id"]
            if cid not in revealed:
                continue
            p = project(np.array(c["position"]), pose, W, H)
            if p is None:
                continue
            u, v = int(p[0]), int(p[1])
            red = cid in verified_at
            col = (40, 40, 235) if red else (40, 200, 240)
            pulse = 6 + int(3 * math.sin(f * 0.4))
            cv2.circle(img, (u, v), pulse + 8, col, 1, cv2.LINE_AA)
            cv2.circle(img, (u, v), pulse, col, 2, cv2.LINE_AA)
            label = f"#{c['failure_id']} {c['type']}" + ("  VERIFIED" if red else "")
            cv2.putText(img, label, (u + 12, v - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.45,
                        col, 1, cv2.LINE_AA)

        # HUD
        ov = img.copy()
        cv2.rectangle(ov, (0, 0), (W, 70), (16, 18, 22), -1)
        cv2.rectangle(ov, (0, H - 44), (W, H), (16, 18, 22), -1)
        cv2.addWeighted(ov, 0.55, img, 0.45, 0, img)
        cv2.putText(img, "SHROUD", (24, 34), cv2.FONT_HERSHEY_DUPLEX, 0.95, (255, 255, 255), 2, cv2.LINE_AA)
        cv2.putText(img, "Cooperative UAV inspection sweep", (24, 58),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 220, 255), 1, cv2.LINE_AA)
        n_id, n_ver = len(revealed), len(verified_at)
        cv2.putText(img, f"UAVs active: {n}", (W - 360, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                    (180, 220, 255), 1, cv2.LINE_AA)
        cv2.putText(img, f"identified: {n_id}   verified: {n_ver}", (W - 360, 56),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (60, 200, 240), 1, cv2.LINE_AA)
        # fleet legend
        for i, u in enumerate(fleet):
            col = tuple(int(x * 255) for x in DRONE_COLORS[i][::-1])
            cv2.circle(img, (28 + i * 92, H - 22), 6, col, -1, cv2.LINE_AA)
            cv2.putText(img, u.uav_id, (40 + i * 92, H - 17), cv2.FONT_HERSHEY_SIMPLEX, 0.42,
                        (220, 220, 220), 1, cv2.LINE_AA)
        vw.write(img)

    vw.release()
    r.close()
    sz = os.path.getsize(out)
    print(f"wrote {out}  ({sz/1e6:.2f} MB, {NF} frames, {NF/FPS:.1f}s)")


if __name__ == "__main__":
    main()
