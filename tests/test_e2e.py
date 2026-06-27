"""End-to-end: inspect -> tokenise -> cooperatively validate -> verify -> solve.

Runs the whole pipeline against a local deterministic EVM. Skips if no GL.
"""

import pytest


def test_end_to_end_local(tmp_path):
    try:
        from shroud.pipeline import run_demo
        s = run_demo(network="local", seed=0, n_uavs=6, quick=True,
                     out_dir=str(tmp_path), log=lambda *a, **k: None)
    except Exception as e:                       # pragma: no cover - env dependent
        if "GL" in str(e) or "context" in str(e).lower() or "render" in str(e).lower():
            pytest.skip(f"offscreen GL unavailable: {e}")
        raise
    assert s["chain_counts"]["uavs"] == 9          # 6 EO + 3 SAR
    assert s["chain_counts"]["buildings"] == 20
    assert s["candidates"] >= 6, s
    assert s["sar_finds"] >= 1, s           # high-altitude SAR found deformation/thermal
    assert s["verified"] >= 4, s            # cooperative >=3-UAV validation worked
    assert s["solved"] >= 1, s              # operator lifecycle worked
    # every minted token exists on-chain
    assert s["chain_counts"]["failures"] == s["candidates"]
