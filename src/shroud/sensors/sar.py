"""High-altitude SAR inspection: synthesise a SAR image, detect anomalies,
geo-locate them on the asset.

Like the EO camera, this is the sim-side sensor + edge stage: it produces a
genuine SAR chip, runs the SAR detector on it, and back-projects each hit by
ray-casting against the whole asset (a near-nadir look may hit any structure).
The tokenised image is the colourised SAR chip.
"""

from __future__ import annotations

import hashlib
import os

import cv2
import numpy as np

from ..core.messages import CameraPose, DefectDetection, Header, SensorModality
from ..perception import sar_detect
from ..render.camera import pixel_ray, ray_structure
from ..render.sar import colorize, synth_sar


def inspect_sar(renderer, pose: CameraPose, refinery, defects, uav_id: str, t: float,
                crop_dir: str, seed: int = 0) -> list[DefectDetection]:
    w, h = renderer.w, renderer.h
    sar = synth_sar(renderer, pose, defects, seed)
    col = colorize(sar)
    out: list[DefectDetection] = []
    for dd in sar_detect.detect(sar):
        cx, cy = dd.centroid
        o, d = pixel_ray(cx, cy, pose, w, h)
        hit, best, sid = None, 1e9, -1
        for s in refinery.structures:                 # near-nadir: any structure
            p = ray_structure(o, d, s)
            if p is not None:
                dist = float(np.linalg.norm(p - o))
                if dist < best:
                    best, hit, sid = dist, p, s.id
        if hit is None:
            continue
        x, y, bw, bh = dd.bbox
        m = 8
        crop = col[max(0, y - m):min(h, y + bh + m), max(0, x - m):min(w, x + bw + m)]
        ok, buf = cv2.imencode(".png", cv2.cvtColor(crop, cv2.COLOR_RGB2BGR))
        sha = hashlib.sha256(buf.tobytes()).hexdigest()
        os.makedirs(crop_dir, exist_ok=True)
        path = os.path.join(crop_dir, f"{uav_id}_sar_{sid}_{sha[:10]}.png")
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(buf.tobytes())
        out.append(DefectDetection(
            header=Header(stamp=t), uav_id=uav_id, modality=SensorModality.SAR,
            structure_id=sid, defect_type=dd.defect_type, confidence=float(dd.confidence),
            position=np.asarray(hit, float), bbox=dd.bbox, image_path=path,
            image_sha256=sha, pose=pose, range_m=best, incidence_deg=0.0, illumination=0.0))
    return out
