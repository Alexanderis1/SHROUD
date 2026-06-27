"""Inspection camera: render a UAV viewpoint, run edge CV, emit detections.

This is the sim-side sensor + Jetson edge stage fused into one step: it renders
the scene from a :class:`CameraPose`, runs the OpenCV defect detector on the
pixels, and for each hit (a) back-projects the bbox centre onto the inspected
structure to estimate the 3D position (rejecting rays that miss the structure —
the sky/silhouette false-positive filter), and (b) saves the genuine image crop
and its sha256 (the data tokenised on-chain).
"""

from __future__ import annotations

import hashlib
import os

import cv2
import numpy as np

from ..core.messages import (CameraPose, DefectDetection, Header, SensorModality)
from ..perception import cv_detect
from ..render.camera import pixel_ray, project, ray_structure
from ..sim.infrastructure import Structure


def _dim_for_light(img: np.ndarray, illumination: float) -> np.ndarray:
    if illumination >= 0.999:
        return img
    return (img.astype(np.float32) * (0.30 + 0.70 * illumination)).clip(0, 255).astype(np.uint8)


def inspect(renderer, pose: CameraPose, structure: Structure, uav_id: str, t: float,
            crop_dir: str, modality: SensorModality = SensorModality.EO,
            illumination: float = 1.0) -> list[DefectDetection]:
    w, h = renderer.w, renderer.h
    img = renderer.render(pose)
    if modality == SensorModality.EO:
        img = _dim_for_light(img, illumination)
    dets2d = cv_detect.detect(img)

    out: list[DefectDetection] = []
    for dd in dets2d:
        cx, cy = dd.centroid
        o, d = pixel_ray(cx, cy, pose, w, h)
        hit = ray_structure(o, d, structure)
        if hit is None:                       # ray missed the inspected structure
            continue
        x, y, bw, bh = dd.bbox
        m = 8
        x0, y0 = max(0, x - m), max(0, y - m)
        x1, y1 = min(w, x + bw + m), min(h, y + bh + m)
        crop = img[y0:y1, x0:x1]
        ok, buf = cv2.imencode(".png", cv2.cvtColor(crop, cv2.COLOR_RGB2BGR))
        sha = hashlib.sha256(buf.tobytes()).hexdigest()
        os.makedirs(crop_dir, exist_ok=True)
        path = os.path.join(crop_dir, f"{uav_id}_{structure.id}_{sha[:10]}.png")
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(buf.tobytes())
        n = structure.outward_normal(hit)
        incidence = float(np.degrees(np.arccos(np.clip(abs(d @ n), 0, 1))))
        out.append(DefectDetection(
            header=Header(stamp=t), uav_id=uav_id, modality=modality,
            structure_id=structure.id, defect_type=dd.defect_type,
            confidence=float(dd.confidence), position=np.asarray(hit, float),
            bbox=dd.bbox, image_path=path, image_sha256=sha, pose=pose,
            range_m=float(np.linalg.norm(hit - np.asarray(pose.eye, float))),
            incidence_deg=incidence, illumination=illumination))
    return out
