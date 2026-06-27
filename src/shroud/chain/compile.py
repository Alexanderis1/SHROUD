"""Compile contracts/ShroudRegistry.sol with py-solc-x and cache the artifact.

The compiled ABI + bytecode is written to ``contracts/out/ShroudRegistry.json``
and the ABI alone to ``src/shroud/chain/abi/ShroudRegistry.json`` (shipped with
the package and consumed by the dashboard / reference client as the ICD).
"""

from __future__ import annotations

import json
from pathlib import Path

import solcx

SOLC_VERSION = "0.8.24"
EVM_VERSION = "paris"  # widest Avalanche C-Chain compatibility (no PUSH0 needed)

_REPO = Path(__file__).resolve().parents[3]
CONTRACT_SRC = _REPO / "contracts" / "ShroudRegistry.sol"
OUT_DIR = _REPO / "contracts" / "out"
ABI_DIR = Path(__file__).resolve().parent / "abi"
CONTRACT_NAME = "ShroudRegistry"


def ensure_solc() -> None:
    installed = {str(v) for v in solcx.get_installed_solc_versions()}
    if SOLC_VERSION not in installed:
        solcx.install_solc(SOLC_VERSION)


def compile_contract(write_cache: bool = True) -> dict:
    """Compile and return ``{"abi": [...], "bytecode": "0x..."}``."""
    ensure_solc()
    compiled = solcx.compile_files(
        [str(CONTRACT_SRC)],
        output_values=["abi", "bin"],
        solc_version=SOLC_VERSION,
        evm_version=EVM_VERSION,
        optimize=True,
        optimize_runs=200,
    )
    key = next(k for k in compiled if k.endswith(f":{CONTRACT_NAME}"))
    art = compiled[key]
    artifact = {"abi": art["abi"], "bytecode": "0x" + art["bin"]}
    if write_cache:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        ABI_DIR.mkdir(parents=True, exist_ok=True)
        (OUT_DIR / f"{CONTRACT_NAME}.json").write_text(json.dumps(artifact, indent=2))
        (ABI_DIR / f"{CONTRACT_NAME}.json").write_text(json.dumps(art["abi"], indent=2))
    return artifact


def load_artifact() -> dict:
    """Return the cached artifact, compiling on first use."""
    cached = OUT_DIR / f"{CONTRACT_NAME}.json"
    if cached.exists():
        return json.loads(cached.read_text())
    return compile_contract()


if __name__ == "__main__":
    a = compile_contract()
    print(f"compiled {CONTRACT_NAME}: {len(a['abi'])} ABI entries, "
          f"{len(a['bytecode']) // 2} bytes of bytecode")
