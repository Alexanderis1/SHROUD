"""UAV fleet: low-altitude EO inspectors and high-altitude SAR UAVs."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ..chain.eip712 import UavSigner
from ..core.messages import AltitudeClass


@dataclass
class Uav:
    uav_id: str
    signer: UavSigner                 # on-chain identity (deterministic from seed)
    home: np.ndarray                  # base / current standoff position
    altitude_class: AltitudeClass = AltitudeClass.LOW
    battery_frac: float = 1.0

    @property
    def address(self) -> str:
        return self.signer.address
