"""Generate (or show) the funded deployer/relayer wallet for Avalanche Fuji.

Writes DEPLOYER_ADDRESS / DEPLOYER_PRIVATE_KEY to .env (gitignored) if absent,
and prints the address to fund at a Fuji faucet. Never overwrites an existing
key.
"""

from __future__ import annotations

import secrets
from pathlib import Path

from eth_account import Account

REPO = Path(__file__).resolve().parents[1]
ENV = REPO / ".env"


def _read_env() -> dict:
    d = {}
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                d[k.strip()] = v.strip()
    return d


def main() -> None:
    env = _read_env()
    if env.get("DEPLOYER_PRIVATE_KEY", "").startswith("0x") and len(env["DEPLOYER_PRIVATE_KEY"]) == 66:
        print(f"Deployer already configured: {env.get('DEPLOYER_ADDRESS')}")
        print("Fund this address with Fuji test AVAX, then run scripts/deploy.py")
        return

    acct = Account.create(secrets.token_bytes(32))
    lines = [
        "# SHROUD secrets — gitignored. DO NOT COMMIT.",
        "FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc",
        "CHAIN_ID=43113",
        f"DEPLOYER_ADDRESS={acct.address}",
        f"DEPLOYER_PRIVATE_KEY=0x{acct.key.hex()}",
        "SHROUD_CONTRACT_ADDRESS=",
        "",
    ]
    ENV.write_text("\n".join(lines), encoding="utf-8")
    print("Generated new deployer wallet (written to .env, gitignored).")
    print(f"  DEPLOYER_ADDRESS = {acct.address}")
    print("\nFund it with Fuji test AVAX:")
    print("  https://core.app/tools/testnet-faucet/   (select C-Chain, Fuji)")
    print("  https://faucet.avax.network/")
    print("\nThen: python scripts/deploy.py --network fuji")


if __name__ == "__main__":
    main()
