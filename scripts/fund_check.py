"""Check (and optionally wait for) the deployer's Avalanche Fuji balance.

    python scripts/fund_check.py            # one-shot
    python scripts/fund_check.py --wait     # poll until funded
"""

from __future__ import annotations

import argparse
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3

from shroud.chain.client import FUJI_RPC_DEFAULT

ENV = Path(__file__).resolve().parents[1] / ".env"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--wait", action="store_true")
    args = ap.parse_args()
    load_dotenv(ENV)

    rpc = os.getenv("FUJI_RPC_URL", FUJI_RPC_DEFAULT)
    addr = os.getenv("DEPLOYER_ADDRESS", "")
    if not addr:
        raise SystemExit("No DEPLOYER_ADDRESS in .env — run scripts/gen_key.py")
    w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 30}))
    addr = Web3.to_checksum_address(addr)

    while True:
        bal = w3.eth.get_balance(addr)
        print(f"{addr}  {bal/1e18:.5f} AVAX  (block {w3.eth.block_number})")
        if bal > 0 or not args.wait:
            if bal > 0:
                print("Funded — ready to deploy: python scripts/deploy.py --network fuji")
            break
        time.sleep(15)


if __name__ == "__main__":
    main()
