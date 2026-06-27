"""Time-stepped simulation world for SHROUD.

Owns ground truth: the environment (asset + illumination + LOS), the injected
defects, the UAV airframes (truth), the clock and the RNG. Software nodes
(sensors, C2 coordinator, chain bridge, recorder) see the world only through
messages on the bus — except the explicitly sim-side sensors, which act as the
"physics plugins" and are the only nodes allowed to read defect ground truth.

Unlike the counter-UAS world it derives from, there are no moving hostiles and
no engagement: the world is a static asset and a fleet that cooperatively
inspects it, so the step loop is just fleet kinematics + node updates.
"""

from __future__ import annotations

from typing import Callable

import numpy as np

from ..core.bus import MessageBus
from ..core.messages import reset_message_seq
from ..core.node import Node
from ..core.rng import RngRegistry
from .defects import Defect
from .environment import Environment


class World:
    def __init__(self, env: Environment, defects: list[Defect], dt: float = 0.1, seed: int = 0):
        self.env = env
        self.defects = defects
        self.defects_by_id = {d.id: d for d in defects}
        self.dt = dt
        self.t = 0.0
        self.seed = seed
        self.bus = MessageBus()
        reset_message_seq()
        self.rng = np.random.default_rng(seed)
        self.rng_registry = RngRegistry(seed)

        self.uavs: dict[str, object] = {}     # friendly truth: airframes by id
        self.nodes: list[Node] = []
        self.events: list[dict] = []

    # -- construction --------------------------------------------------------
    def add_node(self, node: Node) -> None:
        self.nodes.append(node)

    def add_uav(self, uav) -> None:
        self.uavs[uav.uav_id] = uav

    def log_event(self, kind: str, **data) -> None:
        self.events.append({"t": round(self.t, 3), "kind": kind, **data})

    # -- stepping ------------------------------------------------------------
    def step(self) -> None:
        # 1) fly the airframes (truth kinematics)
        for uav in self.uavs.values():
            uav.step_kinematics(self.dt, self.t)
        # 2) run software + sim-side nodes at their declared rates
        for node in self.nodes:
            node.maybe_update(self.t, self.dt)
        self.t += self.dt

    def run(self, duration: float, on_step: Callable[["World"], None] | None = None,
            stop_when: Callable[["World"], bool] | None = None) -> dict:
        end = self.t + duration
        while self.t < end:
            self.step()
            if on_step is not None:
                on_step(self)
            if stop_when is not None and stop_when(self):
                break
        return self.summary()

    # -- scoring -------------------------------------------------------------
    def summary(self) -> dict:
        found = [d for d in self.defects if d.found_by]
        return {
            "t_end": round(self.t, 2),
            "defects_truth": len(self.defects),
            "defects_detected": len(found),
            "detection_recall": round(len(found) / max(1, len(self.defects)), 3),
            "events": len(self.events),
            "uavs": len(self.uavs),
        }
