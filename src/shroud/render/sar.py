"""Synthetic-aperture-radar image synthesis for the high-altitude pass.

SAR is illumination-independent: we synthesise a radar-backscatter image from
the scene depth buffer (surface slope -> bright returns, layover at edges),
multiplicative speckle, and bright returns composited at defects whose radar
signature is high (structural deformation, hot-spots). The result is a grayscale
SAR chip the SAR detector runs on — so the high-altitude UAVs genuinely "see"
the deformation/thermal defects mono-EO misses, day or night.
"""

from __future__ import annotations

import cv2
import numpy as np

from ..core.messages import CameraPose
from .camera import project


def synth_sar(renderer, pose: CameraPose, defects, seed: int = 0) -> np.ndarray:
    rgb, depth = renderer.render_depth(pose)
    h, w = depth.shape
    valid = depth > 0
    d = np.where(valid, depth, 0.0).astype(np.float32)

    gx = cv2.Sobel(d, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(d, cv2.CV_32F, 0, 1, ksize=3)
    grad = np.hypot(gx, gy)
    base = 22.0 + 95.0 * np.tanh(grad * 0.22)          # edges/slopes -> capped ~117
    base[valid] = np.maximum(base[valid], 48.0)         # bodies give a mild return
    base[~valid] = 8.0                                  # sky / no return

    rng = np.random.default_rng([int(seed), 0x5A12])
    speckle = rng.gamma(8.0, 1.0 / 8.0, size=base.shape)   # mean 1, lower variance
    img = np.clip(base * speckle, 0, 200)               # background stays < detector gate

    f = (h / 2.0) / np.tan(np.radians(pose.fov_deg) / 2.0)
    for de in defects:
        if de.sar_signature < 0.50:                     # only strong scatterers (deform/thermal)
            continue
        p = project(de.position, pose, w, h)
        if p is None:
            continue
        u, v, zc = p
        ui, vi = int(round(u)), int(round(v))
        if not (0 <= ui < w and 0 <= vi < h):
            continue
        if valid[vi, ui] and abs(float(depth[vi, ui]) - zc) > 8.0:
            continue                                     # occluded by a nearer surface
        is_thermal = de.thermal > 0.4
        bright = 255.0 if is_thermal else 232.0
        rad = int(np.clip(de.size_m * f / max(zc, 1.0), 3, 24))
        cv2.circle(img, (ui, vi), rad, bright, -1)
        if is_thermal:
            cv2.circle(img, (ui, vi), max(2, rad // 2), 255.0, -1)
    return img.astype(np.uint8)


def colorize(sar: np.ndarray) -> np.ndarray:
    """Inferno-mapped SAR for display / the tokenised chip (RGB)."""
    return cv2.cvtColor(cv2.applyColorMap(sar, cv2.COLORMAP_INFERNO), cv2.COLOR_BGR2RGB)
