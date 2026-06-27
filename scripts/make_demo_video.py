"""Combined demo MP4: drones flying (3D fly-through) + the operator console.

Segment A reuses the rendered fly-through (runs/shroud_flight.mp4); Segment B
renders the SHROUD operator console (the same dashboard served by `shroud serve`)
frame-by-frame from the run recording, replaying identified -> >=3-UAV verified
-> in-maintenance -> solved. Writes runs/shroud_demo_full.mp4.
"""

from __future__ import annotations

import json
import math
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

W, H, FPS = 1280, 720, 30
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RUNS = os.path.join(REPO, "runs")

BG = (20, 15, 10)            # all colours BGR
PANEL = (30, 22, 16)
LINE = (53, 41, 29)
TXT = (240, 230, 220)
DIM = (166, 147, 126)
ACCENT = (230, 211, 57)
COL = {"IDENTIFIED": (41, 180, 240), "VERIFIED": (84, 59, 239),
       "IN_MAINTENANCE": (246, 130, 59), "SOLVED": (123, 210, 52)}


def text(img, s, org, scale=0.5, col=TXT, thick=1, font=cv2.FONT_HERSHEY_SIMPLEX):
    cv2.putText(img, s, org, font, scale, col, thick, cv2.LINE_AA)


def panel(img, x0, y0, x1, y1):
    cv2.rectangle(img, (x0, y0), (x1, y1), PANEL, -1)
    cv2.rectangle(img, (x0, y0), (x1, y1), LINE, 1)


class Console:
    def __init__(self, rec):
        self.rec = rec
        self.bounds = rec["asset"]["bounds"]
        self.by_fid = {c["failure_id"]: c for c in rec["candidates"]}
        self.crops = {}
        self.MX = (24, 88, 700, 700)        # map panel
        self.FX = (720, 88, 1256, 700)      # feed panel

    def crop(self, c):
        fid = c["failure_id"]
        if fid not in self.crops:
            p = os.path.join(RUNS, (c.get("image_path") or "").replace("/", os.sep))
            self.crops[fid] = cv2.imread(p) if p and os.path.exists(p) else None
        return self.crops[fid]

    def w2c(self, x, y):
        x0, y0, x1, y1 = self.bounds
        mx0, my0, mx1, my1 = self.MX
        m = 22
        s = min((mx1 - mx0 - 2 * m) / (x1 - x0), (my1 - my0 - 2 * m) / (y1 - y0))
        return int(mx0 + m + (x - x0) * s), int(my1 - m - (y - y0) * s), s

    def header(self, img, live, frame):
        cv2.rectangle(img, (0, 0), (W, 72), (28, 20, 14), -1)
        cv2.line(img, (0, 72), (W, 72), LINE, 1)
        text(img, "SHROUD", (24, 34), 0.9, ACCENT, 2, cv2.FONT_HERSHEY_DUPLEX)
        text(img, "Cooperative UAV infrastructure monitoring  -  operator console", (160, 30), 0.5, DIM)
        s = self.rec["summary"]
        text(img, f"{s.get('network','local')} EVM   contract {s.get('contract','')[:12]}...", (160, 52), 0.46, DIM)
        n_id = len(live)
        n_ver = sum(v["state"] in ("VERIFIED", "IN_MAINTENANCE", "SOLVED") for v in live.values())
        n_sol = sum(v["state"] == "SOLVED" for v in live.values())
        for i, (lab, val, col) in enumerate([("identified", n_id, TXT), ("verified", n_ver, COL["VERIFIED"]),
                                             ("solved", n_sol, COL["SOLVED"])]):
            x = W - 330 + i * 110
            cv2.rectangle(img, (x, 14), (x + 96, 60), PANEL, -1)
            cv2.rectangle(img, (x, 14), (x + 96, 60), LINE, 1)
            text(img, str(val), (x + 12, 42), 0.8, col, 2)
            text(img, lab, (x + 12, 55), 0.38, DIM)

    def map(self, img, live, frame):
        mx0, my0, mx1, my1 = self.MX
        panel(img, mx0, my0, mx1, my1)
        text(img, "SITE MAP", (mx0 + 12, my0 + 22), 0.45, DIM)
        for st in self.rec["asset"]["structures"]:
            cx, cy, s = self.w2c(st["center"][0], st["center"][1])
            if st["type"] == "pipe_rack" and st.get("size"):
                w, h = int(st["size"][0] * s * 2), int(st["size"][1] * s * 2)
                cv2.rectangle(img, (cx - w // 2, cy - h // 2), (cx + w // 2, cy + h // 2), (47, 36, 22), -1)
                cv2.rectangle(img, (cx - w // 2, cy - h // 2), (cx + w // 2, cy + h // 2), (70, 54, 36), 1)
            else:
                cv2.circle(img, (cx, cy), max(3, int(st["radius"] * s)), (47, 36, 22), -1)
                cv2.circle(img, (cx, cy), max(3, int(st["radius"] * s)), (70, 54, 36), 1)
        for u in self.rec["uavs"]:
            cx, cy, _ = self.w2c(u["home"][0], u["home"][1])
            cv2.circle(img, (cx, cy), 4, ACCENT, -1, cv2.LINE_AA)
            text(img, u["id"], (cx + 7, cy + 3), 0.34, DIM)
        for fid, v in live.items():
            c = self.by_fid[fid]
            cx, cy, _ = self.w2c(c["position"][0], c["position"][1])
            col = COL[v["state"]]
            pr = int(7 + 2 * math.sin(frame * 0.3 + fid))
            cv2.circle(img, (cx, cy), pr + 6, col, 1, cv2.LINE_AA)
            cv2.circle(img, (cx, cy), pr, col, -1, cv2.LINE_AA)
            text(img, f"#{fid}", (cx + pr + 4, cy + 3), 0.4, col, 1)

    def feed(self, img, order, live, frame):
        fx0, fy0, fx1, fy1 = self.FX
        panel(img, fx0, fy0, fx1, fy1)
        text(img, "FAILURE FEED", (fx0 + 12, fy0 + 22), 0.45, DIM)
        y = fy0 + 36
        ch = 104
        for fid in list(reversed(order))[:5]:
            v = live[fid]
            c = self.by_fid[fid]
            col = COL[v["state"]]
            cv2.rectangle(img, (fx0 + 10, y), (fx1 - 10, y + ch - 8), (36, 28, 20), -1)
            cv2.rectangle(img, (fx0 + 10, y), (fx0 + 14, y + ch - 8), col, -1)   # left accent
            text(img, f"Failure #{fid}", (fx0 + 24, y + 22), 0.55, TXT, 1)
            text(img, c["type"], (fx0 + 150, y + 22), 0.46, ACCENT, 1)
            # state badge
            bw = 130
            cv2.rectangle(img, (fx1 - 18 - bw, y + 8), (fx1 - 18, y + 28), tuple(int(x * 0.4) for x in col), -1)
            text(img, v["state"].replace("_", " "), (fx1 - 14 - bw, y + 23), 0.4, col, 1)
            text(img, f"on {self.sname(c['structure_id'])[:26]} - by {c['reporter']}", (fx0 + 24, y + 42), 0.4, DIM)
            # quorum bar
            qx0, qx1 = fx0 + 24, fx1 - 150
            cv2.rectangle(img, (qx0, y + 52), (qx1, y + 58), (40, 34, 26), -1)
            w = int((qx1 - qx0) * min(1.0, len(v["recs"]) / 3.0))
            cv2.rectangle(img, (qx0, y + 52), (qx0 + w, y + 58), col, -1)
            text(img, "recognisers: " + " ".join(sorted(v["recs"])) + f"  ({len(v['recs'])}/3)",
                 (fx0 + 24, y + 76), 0.38, (150, 210, 170) if len(v["recs"]) >= 3 else DIM)
            text(img, f"x {c['position'][0]:.0f}  y {c['position'][1]:.0f}  z {c['position'][2]:.0f}",
                 (fx0 + 24, y + 92), 0.36, DIM)
            cr = self.crop(c)
            if cr is not None:
                th = cv2.resize(cr, (84, 62))
                img[y + 30:y + 92, fx1 - 102:fx1 - 18] = th
                cv2.rectangle(img, (fx1 - 102, y + 30), (fx1 - 18, y + 92), LINE, 1)
            y += ch
            if y > fy1 - ch:
                break

    def sname(self, sid):
        for s in self.rec["asset"]["structures"]:
            if s["id"] == sid:
                return s["name"]
        return f"structure {sid}"

    def frame(self, order, live, frame):
        img = np.full((H, W, 3), BG, np.uint8)
        self.header(img, live, frame)
        self.map(img, live, frame)
        self.feed(img, order, live, frame)
        text(img, "Avalanche-tokenised, cooperatively-validated failure tracking",
             (24, H - 16), 0.46, DIM)
        return img


def main():
    rec_path = os.path.join(RUNS, "demo.json")
    flight = os.path.join(RUNS, "shroud_flight.mp4")
    if not os.path.exists(rec_path):
        from shroud.pipeline import run_demo
        run_demo(network="local", out_dir=RUNS, log=lambda *a, **k: None)
    rec = json.load(open(rec_path))
    out = os.path.join(RUNS, "shroud_demo_full.mp4")
    vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W, H))

    # --- Segment A: drone fly-through (reuse rendered footage) ---
    if os.path.exists(flight):
        cap = cv2.VideoCapture(flight)
        while True:
            ok, fr = cap.read()
            if not ok:
                break
            if fr.shape[1] != W or fr.shape[0] != H:
                fr = cv2.resize(fr, (W, H))
            vw.write(fr)
        cap.release()

    # --- transition ---
    for i in range(26):
        img = np.full((H, W, 3), BG, np.uint8)
        a = min(1.0, i / 18)
        text(img, "OPERATOR CONSOLE", (W // 2 - 220, H // 2 - 10), 1.1,
             tuple(int(c * a) for c in ACCENT), 2, cv2.FONT_HERSHEY_DUPLEX)
        text(img, "client interface connected to the on-chain failure registry",
             (W // 2 - 260, H // 2 + 28), 0.55, tuple(int(c * a) for c in DIM))
        vw.write(img)

    # --- Segment B: operator console replay ---
    con = Console(rec)
    order, live = [], {}
    for _ in range(24):                       # intro hold (empty console)
        vw.write(con.frame(order, live, _))
    fnum = 24
    for ev in rec["events"]:
        fid = ev["failure_id"]
        if ev["kind"] == "identified":
            live[fid] = {"state": "IDENTIFIED", "recs": {con.by_fid[fid]["reporter"]}}
            order.append(fid)
            hold = 20
        elif ev["kind"] == "confirmed":
            live[fid]["recs"].add(ev["uav"])
            hold = 14
        elif ev["kind"] == "verified":
            live[fid]["state"] = "VERIFIED"
            hold = 18
        elif ev["kind"] == "lifecycle":
            live[fid]["state"] = "IN_MAINTENANCE"
            for _ in range(16):
                vw.write(con.frame(order, live, fnum)); fnum += 1
            live[fid]["state"] = "SOLVED"
            hold = 30
        else:
            hold = 8
        for _ in range(hold):
            vw.write(con.frame(order, live, fnum)); fnum += 1
    for _ in range(70):                       # outro hold
        vw.write(con.frame(order, live, fnum)); fnum += 1

    vw.release()
    sz = os.path.getsize(out)
    print(f"wrote {out}  ({sz/1e6:.2f} MB)")


if __name__ == "__main__":
    main()
