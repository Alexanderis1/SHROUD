"""SAR anomaly detector — bright local returns over the speckle background.

Reuses the EO detector's Detection2D + NMS. Very bright + compact returns are
read as thermal hot-spots; broader bright returns as structural deformation.
"""

from __future__ import annotations

import cv2
import numpy as np

from ..core.messages import DefectType
from .cv_detect import Detection2D, _nms


def detect(sar: np.ndarray) -> list[Detection2D]:
    # Defect returns saturate near 255; the speckled background is capped < 205.
    mask = (sar > 210).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    out: list[Detection2D] = []
    for c in cnts:
        area = cv2.contourArea(c)
        if area < 12:
            continue
        x, y, w, h = cv2.boundingRect(c)
        roi = sar[y:y + h, x:x + w]
        meanb = float(roi.mean())
        # a saturated hot core -> thermal; a bright structural patch -> deformation
        dtype = DefectType.THERMAL_ANOMALY if meanb > 246 else DefectType.DEFORMATION
        conf = float(np.clip(0.50 + (meanb - 210) / 120.0 + 0.03 * np.log1p(area), 0, 0.97))
        out.append(Detection2D((x, y, w, h), dtype, conf, int(area), (x + w / 2, y + h / 2)))
    return _nms(out, 0.4)
