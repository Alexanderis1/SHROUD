"""In-process publish/subscribe bus mimicking the ROS 2 topic graph.

The bus is the single seam between SHROUD logic and the middleware: every
module talks only to :class:`MessageBus` through :class:`Publisher` and
subscription callbacks. Migrating to ROS 2 means re-implementing these two
small classes on top of ``rclpy`` — node code does not change.

Delivery is synchronous and deterministic (callbacks run in subscription
order during ``publish``), which keeps simulation runs reproducible.

An optional *comms router* may be attached (duck-typed ``.routes(topic,
sender, receiver)`` / ``.send(topic, msg, callback, sender, receiver)``) to
model the C2<->UAV datalink (latency / loss) instead of synchronous delivery.
Adapted from COOP-UAV-S ``core/bus.py``.
"""

from __future__ import annotations

import fnmatch
from collections import defaultdict
from typing import Any, Callable

Callback = Callable[[Any], None]


class Publisher:
    """Handle returned by :meth:`MessageBus.create_publisher`."""

    def __init__(self, bus: "MessageBus", topic: str, endpoint: str | None = None):
        self._bus = bus
        self.topic = topic
        self.endpoint = endpoint

    def publish(self, msg: Any) -> None:
        self._bus.publish(self.topic, msg, sender=self.endpoint)


class MessageBus:
    def __init__(self) -> None:
        self._subs: dict[str, list[tuple[Callback, str | None]]] = defaultdict(list)
        self._pattern_subs: list[tuple[str, Callable[[str, Any], None]]] = []
        self.router: Any | None = None

    def create_publisher(self, topic: str, endpoint: str | None = None) -> Publisher:
        return Publisher(self, topic, endpoint)

    def subscribe(self, topic: str, callback: Callback, endpoint: str | None = None) -> None:
        self._subs[topic].append((callback, endpoint))

    def subscribe_pattern(self, pattern: str, callback: Callable[[str, Any], None]) -> None:
        """Subscribe to all topics matching a glob (e.g. ``uav/*/state``).

        Pattern subscribers receive ``(topic, msg)`` and are always delivered
        synchronously (evaluation-side taps, not radio links)."""
        self._pattern_subs.append((pattern, callback))

    def publish(self, topic: str, msg: Any, sender: str | None = None) -> None:
        router = self.router
        for cb, endpoint in self._subs.get(topic, ()):
            if router is not None and router.routes(topic, sender, endpoint):
                router.send(topic, msg, cb, sender, endpoint)
            else:
                cb(msg)
        for pattern, cb in self._pattern_subs:
            if fnmatch.fnmatch(topic, pattern):
                cb(topic, msg)
