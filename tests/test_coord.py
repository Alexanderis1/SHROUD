"""Graph-theoretic coordination: auction allocation + TSP routing."""

import math

import numpy as np

from shroud.chain.identities import uav_signers
from shroud.coord.allocation import select_validators
from shroud.coord.graph import (auction_allocate, coverage_graph, ordered_structures,
                                route_length, tsp_order)
from shroud.core.messages import AltitudeClass
from shroud.fleet import Uav
from shroud.sim.infrastructure import build_procedural_refinery


def _fleet(ref, n):
    sg = uav_signers(0, [f"uav-{i+1}" for i in range(n)])
    xmin, ymin, xmax, ymax = ref.bounds
    cx, cy = ref.center[:2]
    out = []
    for i in range(n):
        a = 2 * math.pi * i / n
        home = np.array([cx + (xmax - xmin) * 0.5 * math.cos(a),
                         cy + (ymax - ymin) * 0.5 * math.sin(a), 20.0])
        out.append(Uav(f"uav-{i+1}", sg[f"uav-{i+1}"], home, AltitudeClass.LOW))
    return out


def test_auction_covers_every_structure_once_and_balances():
    ref = build_procedural_refinery(0)
    fleet = _fleet(ref, 6)
    alloc = auction_allocate(ref.structures, fleet)
    allocated = sorted(s for v in alloc.values() for s in v)
    assert allocated == [s.id for s in ref.structures]      # exact cover
    counts = [len(v) for v in alloc.values()]
    assert max(counts) - min(counts) <= 4                    # roughly balanced


def test_tsp_does_not_lengthen_route():
    ref = build_procedural_refinery(0)
    u = _fleet(ref, 1)[0]
    sids = [s.id for s in ref.structures]
    naive = route_length(ref, u, sids)
    opt = route_length(ref, u, ordered_structures(ref, u, sids))
    assert opt <= naive + 1e-6                               # 2-opt never worse
    assert opt < naive * 0.8                                 # and meaningfully shorter


def test_tsp_order_is_permutation():
    pts = [np.array([0, 0]), np.array([10, 0]), np.array([10, 10]), np.array([0, 10])]
    assert sorted(tsp_order(pts, 0)) == [0, 1, 2, 3]


def test_coverage_graph_and_validators():
    ref = build_procedural_refinery(0)
    g = coverage_graph(ref.structures)
    assert g.number_of_nodes() == 20 and g.number_of_edges() > 0
    v = select_validators(ref.center, _fleet(ref, 6), 3, exclude={"uav-1"})
    assert len(v) == 3 and all(u.uav_id != "uav-1" for u in v)
