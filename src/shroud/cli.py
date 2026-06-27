"""SHROUD command-line entry point.

    shroud demo                 # full end-to-end run on a local deterministic EVM
    shroud demo --network fuji  # same, against live Avalanche Fuji (needs funding)
    shroud serve                # serve the dashboard over the latest recording
"""

from __future__ import annotations

import argparse
import sys


def main(argv=None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    ap = argparse.ArgumentParser(prog="shroud", description="Cooperative UAV infrastructure monitoring")
    sub = ap.add_subparsers(dest="cmd")

    d = sub.add_parser("demo", help="end-to-end inspect -> tokenise -> validate -> verify")
    d.add_argument("--network", choices=["local", "fuji"], default="local")
    d.add_argument("--seed", type=int, default=0)
    d.add_argument("--uavs", type=int, default=6)
    d.add_argument("--illumination", type=float, default=1.0)
    d.add_argument("--full", action="store_true", help="dense viewpoint coverage (slower)")
    d.add_argument("--out", default="runs")

    s = sub.add_parser("serve", help="serve the 3D dashboard over a recording")
    s.add_argument("--recording", default="runs/demo.json")
    s.add_argument("--port", type=int, default=8000)

    args = ap.parse_args(argv)
    if args.cmd == "demo":
        from .pipeline import run_demo
        run_demo(network=args.network, seed=args.seed, n_uavs=args.uavs,
                 illumination=args.illumination, quick=not args.full, out_dir=args.out)
        return 0
    if args.cmd == "serve":
        from .viz.server import serve
        serve(args.recording, port=args.port)
        return 0
    ap.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
