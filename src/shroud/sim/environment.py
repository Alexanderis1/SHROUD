"""Static environment: the asset, ambient illumination, and line-of-sight.

Illumination in [0,1] drives the low-altitude EO camera's effective range and
detection quality. Poor light (dawn / dusk / haze) is exactly the regime the
high-altitude SAR UAVs exist to cover — SAR is illumination-independent — so a
low ``illumination`` makes the cooperative low+high mix matter.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .infrastructure import Refinery
from .occlusion import LineOfSight


@dataclass
class Environment:
    refinery: Refinery
    illumination: float = 1.0          # 0 = night, 1 = full daylight
    haze: float = 0.0                  # 0..1 atmospheric attenuation
    los: LineOfSight = field(init=False)

    def __post_init__(self):
        self.los = LineOfSight(self.refinery)

    def eo_quality(self) -> float:
        """Visible-camera quality multiplier from light + haze."""
        return max(0.05, self.illumination * (1.0 - 0.6 * self.haze))

    def sar_quality(self) -> float:
        """SAR is illumination-independent; only mildly haze-sensitive."""
        return max(0.4, 1.0 - 0.2 * self.haze)
