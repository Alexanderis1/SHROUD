"""Deterministic UAV on-chain identities.

UAV signer keys are *sim identities*, not secrets: derived purely from the run
seed and the UAV id, so a seeded run always produces the same signer set and
cooperative validation is reproducible. Only the relayer/deployer key (in the
gitignored .env) is a real funded secret.
"""

from __future__ import annotations

from eth_account import Account
from eth_utils import keccak

from .eip712 import UavSigner

# secp256k1 group order.
_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141


def uav_signer(seed: int, uav_id: str) -> UavSigner:
    raw = int.from_bytes(keccak(seed.to_bytes(32, "big") + uav_id.encode()), "big")
    pk_int = (raw % (_N - 1)) + 1            # guarantee 1 <= pk < N
    pk = pk_int.to_bytes(32, "big")
    acct = Account.from_key(pk)
    return UavSigner(uav_id=uav_id, address=acct.address, private_key="0x" + pk.hex())


def uav_signers(seed: int, uav_ids) -> dict[str, UavSigner]:
    return {uid: uav_signer(seed, uid) for uid in uav_ids}
