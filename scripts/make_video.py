"""Render an MP4 walkthrough of a SHROUD end-to-end run.

Uses the real offscreen renderer to produce frames: an orbit of the refinery
with on-chain failure markers, then a per-failure close-up showing the genuine
CV detection box + the tokenised image crop + the identified -> verified -> solved
status, and a summary card. Reads runs/demo.json (runs the demo first if absent).
"""

from __future__ import annotations

import json
import math
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from shroud.core.messages import CameraPose            # noqa: E402
from shroud.perception import cv_detect                 # noqa: E402
from shroud.render.camera import project                # noqa: E402
from shroud.sim.defects import inject_defects           # noqa: E402
from shroud.sim.infrastructure import build_procedural_refinery  # noqa: E402

W, H, FPS = 960, 600, 30
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RUNS = os.path.join(REPO, "runs")
REC = os.path.join(RUNS, "demo.json")

STATE_COLOR = {           # BGR
    "IDENTIFIED": (40, 200, 240), "VERIFIED": (40, 40, 235),
    "IN_MAINTENANCE": (235, 160, 30), "SOLVED": (60, 200, 60),
    "FALSE_POSITIVE": (130, 130, 130),
}


def panel(img, lines, org=(24, 24), w=600, scale=0.62, pad=12):
    x, y = org
    lh = int(30 * scale / 0.62)
    h = pad * 2 + lh * len(lines)
    ov = img.copy()
    cv2.rectangle(ov, (x, y), (x + w, y + h), (20, 20, 20), -1)
    cv2.addWeighted(ov, 0.55, img, 0.45, 0, img)
    cv2.rectangle(img, (x, y), (x + w, y + h), (90, 90, 90), 1)
    for i, (text, col) in enumerate(lines):
        cv2.putText(img, text, (x + pad, y + pad + lh * (i + 1) - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, scale, col, 1, cv2.LINE_AA)


def banner(img, title, sub=None):
    cv2.putText(img, title, (24, H - 44), cv2.FONT_HERSHEY_DUPLEX, 0.95, (255, 255, 255), 2, cv2.LINE_AA)
    if sub:
        cv2.putText(img, sub, (26, H - 18), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (200, 220, 255), 1, cv2.LINE_AA)


def main():
    if not os.path.exists(REC):
        from shroud.pipeline import run_demo
        run_demo(network="local", out_dir=RUNS, log=lambda *a, **k: None)
    rec = json.load(open(REC))
    seed = 0
    ref = build_procedural_refinery(seed)
    defs = inject_defects(ref, seed, count=14)
    from shroud.render.renderer import Renderer
    r = Renderer(ref, defs, W, H)
    cands = rec["candidates"]
    summary = rec["summary"]

    out = os.path.join(RUNS, "shroud_demo.mp4")
    vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W, H))

    def write(rgb, n=1):
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        for _ in range(n):
            vw.write(bgr)

    center = ref.center
    R = 205.0

    # ---------- Segment A: orbit overview with failure markers ----------
    NA = 140
    for i in range(NA):
        ang = math.radians(35) + 2 * math.pi * (i / NA) * 0.6
        eye = center + np.array([R * math.cos(ang), R * math.sin(ang), 135.0])
        pose = CameraPose(eye=eye, target=center + np.array([0, 0, 16.0]), fov_deg=55)
        img = r.render(pose).copy()
        for c in cands:
            p = project(np.array(c["position"] + [0.0])[:3] if len(c["position"]) == 2
                        else np.array(c["position"]), pose, W, H)
            if p is None:
                continue
            u, v = int(p[0]), int(p[1])
            col = STATE_COLOR.get(c["state"], (200, 200, 200))
            cv2.circle(img, (u, v), 9, col, 2, cv2.LINE_AA)
            cv2.circle(img, (u, v), 2, col, -1)
        panel(img, [("SHROUD", (255, 255, 255)),
                    ("Cooperative UAV monitoring of critical infrastructure", (210, 225, 255)),
                    (f"{summary['structures']} structures  |  {len(rec['uavs'])} UAVs  |  "
                     f"Avalanche {summary['network']}", (180, 200, 230))], w=620)
        banner(img, "Refinery inspection — live failure map",
               "amber=identified  red=verified damage  green=solved")
        write(img)

    # ---------- Segment B: per-failure close-ups ----------
    def outward_pose(c, standoff):
        s = ref.by_id(c["structure_id"])
        pos = np.array(c["position"])
        n = s.outward_normal(pos)
        eye = pos + n * standoff + np.array([0, 0, 1.0])
        eye[2] = max(eye[2], 3.0)
        return CameraPose(eye=eye, target=pos.copy(), fov_deg=44)

    for c in cands:
        s = ref.by_id(c["structure_id"])
        crop = None
        cp = os.path.join(RUNS, c.get("image_path", ""))
        if c.get("image_path") and os.path.exists(cp):
            crop = cv2.imread(cp)
        recs = c.get("recognisers", [])
        n_rec = len(recs)
        verified = c["state"] in ("VERIFIED", "IN_MAINTENANCE", "SOLVED")
        NB = 78
        for i in range(NB):
            standoff = 16.0 - 4.0 * (i / NB)
            pose = outward_pose(c, standoff)
            img = r.render(pose).copy()
            dets = cv_detect.detect(img)
            pc = project(np.array(c["position"]), pose, W, H)
            for dd in dets:
                x, y, bw, bh = dd.bbox
                near = pc and abs(dd.centroid[0] - pc[0]) < 90 and abs(dd.centroid[1] - pc[1]) < 90
                col = (40, 40, 235) if near else (120, 120, 120)
                cv2.rectangle(img, (x, y), (x + bw, y + bh), col, 2)
                if near:
                    cv2.putText(img, f"{dd.defect_type.name} {dd.confidence:.2f}",
                                (x, max(14, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                                (60, 255, 120), 1, cv2.LINE_AA)
            # phased status
            phase = i / NB
            lines = [(f"Failure #{c['failure_id']}  -  {c['type']}", (255, 255, 255)),
                     (f"on {s.name}", (210, 220, 255))]
            if phase < 0.33:
                lines.append((f"UAV {c['reporter']}: edge CV detection", (60, 255, 120)))
            elif phase < 0.66:
                lines.append((f"IDENTIFIED -> tokenised on Avalanche  (reporter {c['reporter']})",
                              (40, 200, 240)))
                lines.append((f"sha256 {c['image_sha256'][:18]}...", (170, 190, 210)))
            else:
                if verified:
                    lines.append((f"VERIFIED by {n_rec} UAVs: {', '.join(recs)}", (40, 60, 240)))
                    lines.append(("cooperative validation: >=3 distinct recognisers", (180, 200, 230)))
                else:
                    lines.append((f"awaiting confirmations ({n_rec} so far)", (40, 200, 240)))
            panel(img, lines, w=640)
            if crop is not None:
                ch, cw = crop.shape[:2]
                sc = 120 / max(ch, cw)
                cthumb = cv2.resize(crop, (int(cw * sc), int(ch * sc)))
                th, tw = cthumb.shape[:2]
                img_bgr_region = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
                img_bgr_region[H - th - 16:H - 16, W - tw - 16:W - 16] = cthumb
                cv2.rectangle(img_bgr_region, (W - tw - 17, H - th - 17), (W - 15, H - 15),
                              (200, 200, 200), 1)
                cv2.putText(img_bgr_region, "tokenised crop", (W - tw - 16, H - th - 22),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 220, 255), 1, cv2.LINE_AA)
                img = cv2.cvtColor(img_bgr_region, cv2.COLOR_BGR2RGB)
            banner(img, f"Cooperative validation  -  failure #{c['failure_id']}")
            write(img)

    # ---------- Segment C: summary card ----------
    pose = CameraPose(eye=center + np.array([R * 0.7, -R * 0.7, 150.0]),
                      target=center + np.array([0, 0, 16.0]), fov_deg=55)
    base = r.render(pose)
    for _ in range(90):
        img = base.copy()
        ov = img.copy()
        cv2.rectangle(ov, (0, 0), (W, H), (15, 18, 24), -1)
        cv2.addWeighted(ov, 0.45, img, 0.55, 0, img)
        panel(img, [
            ("SHROUD  -  run summary", (255, 255, 255)),
            (f"contract  {summary['contract'][:18]}...  (chainId {summary['chainId']})", (200, 220, 255)),
            (f"structures on-chain      {summary['structures']}", (210, 225, 255)),
            (f"ground-truth defects     {summary['defects_truth']}", (210, 225, 255)),
            (f"failure tokens minted    {summary['candidates']}", (40, 200, 240)),
            (f"verified by >=3 UAVs     {summary['verified']}", (60, 90, 245)),
            (f"driven to SOLVED         {summary['solved']}", (60, 200, 60)),
        ], org=(150, 150), w=640, scale=0.7)
        banner(img, "Avalanche-tokenised, cooperatively-validated failure tracking")
        write(img)

    vw.release()
    r.close()
    sz = os.path.getsize(out)
    print(f"wrote {out}  ({sz/1e6:.2f} MB)")
    if sz < 10000:
        print("WARNING: video file suspiciously small — codec may have failed")


if __name__ == "__main__":
    main()
