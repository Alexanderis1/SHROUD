"""Deploy ShroudRegistry to a local EVM or Avalanche Fuji and seed it.

    python scripts/deploy.py --network local           # in-process eth-tester
    python scripts/deploy.py --network fuji             # live Avalanche Fuji

Registers a deterministic UAV signer set and (optionally) the building registry
from a model manifest, then records the address + ABI to deployments/<net>.json
and writes SHROUD_CONTRACT_ADDRESS back to .env.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from dotenv import load_dotenv

from shroud.chain.client import FUJI_RPC_DEFAULT, ShroudChain
from shroud.chain.identities import uav_signers

REPO = Path(__file__).resolve().parents[1]
ENV = REPO / ".env"
DEPLOY_DIR = REPO / "deployments"


def _update_env_address(address: str) -> None:
    if not ENV.exists():
        return
    lines = ENV.read_text().splitlines()
    out, seen = [], False
    for line in lines:
        if line.startswith("SHROUD_CONTRACT_ADDRESS="):
            out.append(f"SHROUD_CONTRACT_ADDRESS={address}")
            seen = True
        else:
            out.append(line)
    if not seen:
        out.append(f"SHROUD_CONTRACT_ADDRESS={address}")
    ENV.write_text("\n".join(out) + "\n", encoding="utf-8")


def main() -> None:
    import os

    ap = argparse.ArgumentParser()
    ap.add_argument("--network", choices=["local", "fuji"], default="local")
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--n-uavs", type=int, default=6)
    ap.add_argument("--buildings", type=str, default="", help="model manifest JSON")
    args = ap.parse_args()

    load_dotenv(ENV)

    if args.network == "fuji":
        rpc = os.getenv("FUJI_RPC_URL", FUJI_RPC_DEFAULT)
        pk = os.getenv("DEPLOYER_PRIVATE_KEY", "")
        if not pk or not pk.startswith("0x"):
            raise SystemExit("No DEPLOYER_PRIVATE_KEY in .env — run scripts/gen_key.py and fund it.")
        chain = ShroudChain.remote(rpc, pk)
        bal = chain.w3.eth.get_balance(chain.deployer_address)
        print(f"Deployer {chain.deployer_address}  balance {bal/1e18:.4f} AVAX  chainId {chain.chain_id}")
        if bal == 0:
            raise SystemExit("Deployer has 0 AVAX — fund it at a Fuji faucet first (scripts/fund_check.py).")
    else:
        chain = ShroudChain.local(seed=args.seed)

    print("Deploying ShroudRegistry...")
    address = chain.deploy()
    print(f"  deployed at {address}")

    # deterministic UAV fleet identities
    ids = [f"uav-{i+1}" for i in range(args.n_uavs)]
    signers = uav_signers(args.seed, ids)
    res = chain.register_uavs([s.address for s in signers.values()])
    print(f"  registered {args.n_uavs} UAV signers (gas {res.gas_used})")

    buildings = []
    if args.buildings and Path(args.buildings).exists():
        manifest = json.loads(Path(args.buildings).read_text())
        for b in manifest.get("structures", []):
            geo = bytes.fromhex(b.get("geo_hash", "00" * 32))
            bid = chain.register_building(b["name"], b["type"], geo)
            buildings.append({"id": bid, "name": b["name"], "type": b["type"]})
        print(f"  registered {len(buildings)} buildings")

    DEPLOY_DIR.mkdir(exist_ok=True)
    suffix = "local" if args.network == "local" else "fuji"
    record = {
        "network": args.network,
        "chainId": chain.chain_id,
        "address": address,
        "deployer": chain.deployer_address,
        "uavs": {uid: s.address for uid, s in signers.items()},
        "buildings": buildings,
        "abi": "src/shroud/chain/abi/ShroudRegistry.json",
    }
    name = f"{suffix}.json" if args.network == "fuji" else f"{suffix}.local.json"
    (DEPLOY_DIR / name).write_text(json.dumps(record, indent=2))

    if args.network == "fuji":
        _update_env_address(address)
        print(f"\nSnowtrace: https://testnet.snowtrace.io/address/{address}")
    print(f"Recorded -> deployments/{name}")


if __name__ == "__main__":
    main()
