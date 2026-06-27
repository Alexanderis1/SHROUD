"""Classical computer-vision defect detector (the Jetson edge CV stage).

Operates on a rendered RGB crop and returns defect detections (bounding box +
type guess + confidence). It keys on the same visual signatures the renderer
bakes into the scene (``shroud.sim.defects._APPEARANCE``):

* dark, vertically-elongated  -> LEAK (a stain running down)
* dark, horizontally-elongated-> CRACK
* orange/brown, saturated      -> CORROSION  (bright+emissive -> THERMAL_ANOMALY)
* warm, lighter-than-steel     -> COATING_LOSS

Thresholds are *relative to the steel surface* in the frame, so the detector
still works when the EO sensor dims the image at low illumination (which is what
makes the high-altitude SAR coverage matter). Deterministic: same image in ->
same detections out.
"""

from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from ..core.messages import DefectType

# Background sky colour the renderer clears to (0.55,0.62,0.70)*255.
_BG = np.array([140, 158, 178], dtype=np.float32)
_MIN_AREA = 28          # px^2 — reject speckle
_MIN_CONF = 0.30


@dataclass
class Detection2D:
    bbox: tuple[int, int, int, int]   # x, y, w, h
    defect_type: DefectType
    confidence: float
    area: int
    centroid: tuple[float, float]


def _scene_mask(rgb: np.ndarray) -> np.ndarray:
    """Pixels belonging to the structure (not the sky background)."""
    d = np.linalg.norm(rgb.astype(np.float32) - _BG, axis=2)
    m = (d > 32).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return m


def _contours(mask: np.ndarray):
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return cnts


def detect(rgb: np.ndarray) -> list[Detection2D]:
    scene = _scene_mask(rgb)
    if scene.sum() < 50:
        return []
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    H, S, V = hsv[:, :, 0].astype(np.float32), hsv[:, :, 1].astype(np.float32), hsv[:, :, 2].astype(np.float32)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    warm = rgb[:, :, 0].astype(np.float32) - rgb[:, :, 2].astype(np.float32)
    # Local-contrast morphology: illumination-independent (works after the EO
    # sensor dims the frame at low light).
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, k)   # dark-on-light
    tophat = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, k)       # light-on-light

    out: list[Detection2D] = []

    # --- dark defects: leaks (vertical streaks) and cracks (horizontal) ---
    dark = ((scene > 0) & (blackhat > 16)).astype(np.uint8)
    for c in _contours(dark):
        area = cv2.contourArea(c)
        if area < _MIN_AREA:
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        aspect = bh / max(bw, 1)
        mag = float(blackhat[y:y + bh, x:x + bw].max())
        # orange-tinted dark on a tank is corrosion, not a leak
        roiwarm = float(warm[y:y + bh, x:x + bw].mean())
        roiS = float(S[y:y + bh, x:x + bw].mean())
        if roiwarm > 16 and roiS > 60:
            dtype = DefectType.CORROSION
        elif aspect >= 1.5:
            dtype = DefectType.LEAK
        elif aspect <= 0.55:
            dtype = DefectType.CRACK
        else:
            dtype = DefectType.LEAK
        conf = float(np.clip(0.40 + (mag / 120.0) + 0.04 * np.log1p(area), 0, 0.99))
        out.append(Detection2D((x, y, bw, bh), dtype, conf, int(area), (x + bw / 2, y + bh / 2)))

    # --- orange/brown: corrosion (brown, mid V) or thermal (bright orange) ---
    hue_orange = ((H <= 24) | (H >= 168))
    orange = ((scene > 0) & (((hue_orange & (S > 55) & (V > 55))
                              | ((warm > 45) & (V > 150) & (S > 45))))).astype(np.uint8)
    for c in _contours(orange):
        area = cv2.contourArea(c)
        if area < _MIN_AREA:
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        roiV = float(V[y:y + bh, x:x + bw].mean())
        roiS = float(S[y:y + bh, x:x + bw].mean())
        roiwarm = float(warm[y:y + bh, x:x + bw].mean())
        thermal = roiV > 170 and roiwarm > 70        # bright, strongly red-shifted
        dtype = DefectType.THERMAL_ANOMALY if thermal else DefectType.CORROSION
        base = 0.62 if thermal else 0.5
        conf = float(np.clip(base + 0.004 * area + 0.0015 * roiS, 0, 0.99))
        out.append(Detection2D((x, y, bw, bh), dtype, conf, int(area), (x + bw / 2, y + bh / 2)))

    # --- coating loss: exposed tan primer/metal — warm, mid-bright, moderate S
    #     (distinct from darker red-brown corrosion and bright thermal) ---
    coat = ((scene > 0) & (warm > 22) & (warm < 120) & (S > 28) & (S < 130)
            & (V > 138)).astype(np.uint8)
    for c in _contours(coat):
        area = cv2.contourArea(c)
        if area < _MIN_AREA * 1.3:        # subtler -> stricter
            continue
        x, y, bw, bh = cv2.boundingRect(c)
        aspect = bh / max(bw, 1)
        if not (0.45 < aspect < 2.4):     # coating loss is a patch, not a streak
            continue
        roiwarm = float(warm[y:y + bh, x:x + bw].mean())
        conf = float(np.clip(0.34 + 0.0035 * area + 0.002 * roiwarm, 0, 0.86))
        out.append(Detection2D((x, y, bw, bh), DefectType.COATING_LOSS, conf, int(area), (x + bw / 2, y + bh / 2)))

    out = _nms(out, iou_thresh=0.4)
    return [d for d in out if d.confidence >= _MIN_CONF]


def _iou(a, b) -> float:
    ax, ay, aw, ah = a.bbox
    bx, by, bw, bh = b.bbox
    x1, y1 = max(ax, bx), max(ay, by)
    x2, y2 = min(ax + aw, bx + bw), min(ay + ah, by + bh)
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    if inter == 0:
        return 0.0
    return inter / (aw * ah + bw * bh - inter)


def _nms(dets: list[Detection2D], iou_thresh: float) -> list[Detection2D]:
    dets = sorted(dets, key=lambda d: -d.confidence)
    keep: list[Detection2D] = []
    for d in dets:
        if all(_iou(d, k) < iou_thresh for k in keep):
            keep.append(d)
    return keep
