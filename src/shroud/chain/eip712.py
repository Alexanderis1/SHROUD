"""EIP-712 domain, digests and signing — the exact Python mirror of the
``ShroudRegistry`` Solidity contract.

The cooperative-validation guarantee is that a confirmation is cryptographically
attributable to a *distinct UAV key*. UAVs sign these digests off-board; the C2
relayer submits them; the contract recovers the signer on-chain. Keeping this in
pure ``eth_abi`` / ``eth_utils`` (no web3) lets us unit-test that the Python
digest equals the contract's ``digestConfirmation`` / ``digestIdentify`` view.
"""

from __future__ import annotations

from dataclasses import dataclass

from eth_abi import encode as abi_encode
from eth_account import Account
from eth_utils import keccak

_DOMAIN_TYPEHASH = keccak(
    b"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
)
CONFIRM_TYPEHASH = keccak(b"Confirmation(uint256 failureId,bool verdict,uint8 confidence)")
IDENTIFY_TYPEHASH = keccak(
    b"Identify(uint256 buildingId,uint8 defectType,bytes32 imageHash,int256 x,int256 y,int256 z)"
)
DOMAIN_NAME = "SHROUD"
DOMAIN_VERSION = "1"


def domain_separator(chain_id: int, contract: str) -> bytes:
    return keccak(
        abi_encode(
            ["bytes32", "bytes32", "bytes32", "uint256", "address"],
            [
                _DOMAIN_TYPEHASH,
                keccak(DOMAIN_NAME.encode()),
                keccak(DOMAIN_VERSION.encode()),
                chain_id,
                contract,
            ],
        )
    )


def _digest(domain_sep: bytes, struct_hash: bytes) -> bytes:
    return keccak(b"\x19\x01" + domain_sep + struct_hash)


def confirmation_digest(
    chain_id: int, contract: str, failure_id: int, verdict: bool, confidence: int
) -> bytes:
    struct_hash = keccak(
        abi_encode(
            ["bytes32", "uint256", "bool", "uint8"],
            [CONFIRM_TYPEHASH, failure_id, verdict, confidence],
        )
    )
    return _digest(domain_separator(chain_id, contract), struct_hash)


def identify_digest(
    chain_id: int,
    contract: str,
    building_id: int,
    defect_type: int,
    image_hash: bytes,
    x: int,
    y: int,
    z: int,
) -> bytes:
    struct_hash = keccak(
        abi_encode(
            ["bytes32", "uint256", "uint8", "bytes32", "int256", "int256", "int256"],
            [IDENTIFY_TYPEHASH, building_id, defect_type, image_hash, x, y, z],
        )
    )
    return _digest(domain_separator(chain_id, contract), struct_hash)


def sign_digest(digest: bytes, private_key) -> bytes:
    """Return a 65-byte r||s||v signature over ``digest`` (v in {27,28})."""
    signer = getattr(Account, "unsafe_sign_hash", None) or getattr(Account, "_sign_hash")
    signed = signer(digest, private_key)
    return bytes(signed.signature)


@dataclass(frozen=True)
class UavSigner:
    """A UAV's on-chain identity: an address + the key it signs verdicts with.

    UAV keys are *sim identities*, derived deterministically from the run seed
    (not secrets) so validation is reproducible — see ``shroud.chain.identities``.
    """
    uav_id: str
    address: str
    private_key: str

    def sign_confirmation(
        self, chain_id: int, contract: str, failure_id: int, verdict: bool, confidence: int
    ) -> bytes:
        return sign_digest(
            confirmation_digest(chain_id, contract, failure_id, verdict, confidence),
            self.private_key,
        )

    def sign_identify(
        self, chain_id, contract, building_id, defect_type, image_hash, x, y, z
    ) -> bytes:
        return sign_digest(
            identify_digest(
                chain_id, contract, building_id, defect_type, image_hash, x, y, z
            ),
            self.private_key,
        )
