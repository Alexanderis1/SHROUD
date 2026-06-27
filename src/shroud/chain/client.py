"""web3 client for the SHROUD registry — local eth-tester or live Avalanche Fuji.

`local` mode uses an in-process deterministic EVM (eth-tester / py-evm) with
unlocked funded accounts — fast contract tests, no network or faucet. `remote`
mode signs every transaction with the funded deployer/relayer key and broadcasts
to the Avalanche Fuji C-Chain (chainId 43113). Same contract, same ABI.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

from web3 import Web3
from web3.logs import DISCARD

from .compile import load_artifact
from .eip712 import UavSigner

FUJI_RPC_DEFAULT = "https://api.avax-test.network/ext/bc/C/rpc"
FUJI_CHAIN_ID = 43113


@dataclass
class TxResult:
    tx_hash: str
    block: int
    gas_used: int
    status: int


class ShroudChain:
    def __init__(self, w3: Web3, deployer, mode: str, abi, bytecode=None, address=None):
        self.w3 = w3
        self.deployer = deployer            # address (local) or LocalAccount (remote)
        self.mode = mode                    # "local" | "remote"
        self.abi = abi
        self.bytecode = bytecode
        self.chain_id = w3.eth.chain_id
        self.contract = w3.eth.contract(abi=abi, address=address) if address else None

    # ----------------------------- constructors ---------------------------
    @classmethod
    def local(cls, seed: int = 0):
        from web3 import EthereumTesterProvider  # noqa: PLC0415
        w3 = Web3(EthereumTesterProvider())
        art = load_artifact()
        deployer = w3.eth.accounts[0]
        return cls(w3, deployer, "local", art["abi"], art["bytecode"])

    @classmethod
    def remote(cls, rpc_url: str, private_key: str, address: str | None = None):
        from eth_account import Account  # noqa: PLC0415
        w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 60}))
        if not w3.is_connected():
            raise ConnectionError(f"cannot reach RPC {rpc_url}")
        acct = Account.from_key(private_key)
        art = load_artifact()
        return cls(w3, acct, "remote", art["abi"], art["bytecode"], address)

    @property
    def deployer_address(self) -> str:
        return self.deployer if self.mode == "local" else self.deployer.address

    # ----------------------------- tx plumbing ----------------------------
    def _send(self, func) -> tuple:
        addr = self.deployer_address
        if self.mode == "local":
            tx_hash = func.transact({"from": addr})
        else:
            nonce = self.w3.eth.get_transaction_count(addr, "pending")
            tx = func.build_transaction({
                "from": addr,
                "nonce": nonce,
                "chainId": self.chain_id,
                "gas": int(func.estimate_gas({"from": addr}) * 1.3),
                "gasPrice": self.w3.eth.gas_price,
            })
            signed = self.deployer.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
        return tx_hash, receipt

    def _deploy_send(self, constructor) -> tuple:
        addr = self.deployer_address
        if self.mode == "local":
            tx_hash = constructor.transact({"from": addr})
        else:
            nonce = self.w3.eth.get_transaction_count(addr, "pending")
            tx = constructor.build_transaction({
                "from": addr,
                "nonce": nonce,
                "chainId": self.chain_id,
                "gas": int(constructor.estimate_gas({"from": addr}) * 1.25),
                "gasPrice": self.w3.eth.gas_price,
            })
            signed = self.deployer.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=240)
        return tx_hash, receipt

    # ----------------------------- deployment -----------------------------
    def deploy(self) -> str:
        Contract = self.w3.eth.contract(abi=self.abi, bytecode=self.bytecode)
        _, receipt = self._deploy_send(Contract.constructor())
        address = receipt["contractAddress"]
        self.contract = self.w3.eth.contract(abi=self.abi, address=address)
        return address

    def attach(self, address: str) -> None:
        self.contract = self.w3.eth.contract(abi=self.abi, address=address)

    # ----------------------------- admin ----------------------------------
    def register_building(self, name: str, structure_type: str, geo_hash: bytes) -> int:
        _, receipt = self._send(
            self.contract.functions.registerBuilding(name, structure_type, geo_hash))
        ev = self.contract.events.BuildingRegistered().process_receipt(receipt, errors=DISCARD)
        return int(ev[0]["args"]["buildingId"])

    def register_uavs(self, addresses: list[str]) -> TxResult:
        addrs = [Web3.to_checksum_address(a) for a in addresses]
        h, r = self._send(self.contract.functions.registerUavs(addrs))
        return self._result(h, r)

    def is_uav(self, address: str) -> bool:
        return bool(self.contract.functions.isUav(Web3.to_checksum_address(address)).call())

    # ----------------------------- identify -------------------------------
    def identify_failure(
        self, building_id: int, defect_type: int, x: int, y: int, z: int,
        image_hash: bytes, image_uri: str, reporter: UavSigner,
    ) -> int:
        sig = reporter.sign_identify(
            self.chain_id, self.contract.address, building_id, defect_type, image_hash, x, y, z)
        _, receipt = self._send(self.contract.functions.identifyFailure(
            building_id, defect_type, x, y, z, image_hash, image_uri, sig))
        ev = self.contract.events.FailureIdentified().process_receipt(receipt, errors=DISCARD)
        return int(ev[0]["args"]["failureId"])

    # ----------------------------- validation -----------------------------
    def submit_confirmation(
        self, failure_id: int, verdict: bool, confidence: int, signer: UavSigner,
    ) -> dict:
        sig = signer.sign_confirmation(
            self.chain_id, self.contract.address, failure_id, verdict, int(confidence))
        h, receipt = self._send(self.contract.functions.submitConfirmation(
            failure_id, verdict, int(confidence), sig))
        verified = self.contract.events.FailureVerified().process_receipt(receipt, errors=DISCARD)
        return {
            "tx": h.hex(),
            "verified": len(verified) > 0,
            "state": self.failure_state(failure_id),
        }

    # ----------------------------- lifecycle ------------------------------
    def set_state(self, failure_id: int, new_state: int) -> TxResult:
        h, r = self._send(self.contract.functions.setState(failure_id, int(new_state)))
        return self._result(h, r)

    # ----------------------------- views ----------------------------------
    def failure_state(self, failure_id: int) -> int:
        return int(self.contract.functions.failureState(failure_id).call())

    def get_failure(self, failure_id: int) -> dict:
        f = self.contract.functions.getFailure(failure_id).call()
        keys = ["buildingId", "defectType", "x", "y", "z", "imageHash", "imageURI",
                "reporter", "state", "recognizerCount", "rejectCount", "identifiedAt"]
        d = dict(zip(keys, f))
        d["imageHash"] = "0x" + (d["imageHash"].hex() if isinstance(d["imageHash"], bytes)
                                 else bytes(d["imageHash"]).hex())
        return d

    def counts(self) -> dict:
        c = self.contract.functions
        return {
            "buildings": int(c.buildingCount().call()),
            "failures": int(c.failureCount().call()),
            "uavs": int(c.uavCount().call()),
        }

    def _result(self, tx_hash, receipt) -> TxResult:
        return TxResult(
            tx_hash=tx_hash.hex(),
            block=int(receipt["blockNumber"]),
            gas_used=int(receipt["gasUsed"]),
            status=int(receipt["status"]),
        )
