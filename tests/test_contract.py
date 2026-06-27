"""Smart-contract logic on a local deterministic EVM (eth-tester / py-evm).

Validates the on-chain spine independently of the simulator: the building
registry, EIP-712 signed identification, cooperative >=3-UAV validation, the
operator lifecycle state machine, and — crucially — that the Python EIP-712
digests equal the contract's own on-chain digests (so UAV signatures verify).
"""

import pytest

from shroud.chain import eip712
from shroud.chain.client import ShroudChain
from shroud.chain.identities import uav_signers

# FailureState ints (mirror of contract enum / shroud.core.messages.FailureState)
IDENTIFIED, VERIFIED, IN_MAINTENANCE, SOLVED, FALSE_POSITIVE = 1, 2, 3, 4, 5


@pytest.fixture(scope="module")
def chain():
    c = ShroudChain.local()
    c.deploy()
    return c


def test_eip712_python_matches_contract(chain):
    addr = chain.contract.address
    cid = chain.chain_id
    # Confirmation digest
    py = eip712.confirmation_digest(cid, addr, 7, True, 88)
    sol = bytes(chain.contract.functions.digestConfirmation(7, True, 88).call())
    assert py == sol
    # Identify digest (incl. a negative coordinate -> int256 two's complement)
    img = b"\x22" * 32
    py_i = eip712.identify_digest(cid, addr, 3, 1, img, -1500, 2000, 3000)
    sol_i = bytes(chain.contract.functions.digestIdentify(3, 1, img, -1500, 2000, 3000).call())
    assert py_i == sol_i


def test_full_validation_lifecycle(chain):
    signers = uav_signers(0, ["uav-1", "uav-2", "uav-3", "uav-4"])
    bid = chain.register_building("Crude Tank T-101", "tank", b"\x11" * 32)
    assert bid == 1
    chain.register_uavs([s.address for s in signers.values()])
    assert all(chain.is_uav(s.address) for s in signers.values())

    img = b"\xab" * 32
    fid = chain.identify_failure(bid, 1, 1000, -2000, 3000, img, "shroud://crop/1", signers["uav-1"])
    assert fid == 1
    assert chain.failure_state(fid) == IDENTIFIED

    # reporter cannot confirm its own report
    with pytest.raises(Exception):
        chain.submit_confirmation(fid, True, 90, signers["uav-1"])

    # 2nd recogniser: still IDENTIFIED (quorum is 3 distinct incl. reporter)
    r = chain.submit_confirmation(fid, True, 90, signers["uav-2"])
    assert r["state"] == IDENTIFIED and not r["verified"]

    # 3rd recogniser: crosses quorum -> VERIFIED
    r = chain.submit_confirmation(fid, True, 92, signers["uav-3"])
    assert r["verified"] and r["state"] == VERIFIED

    # operator lifecycle: VERIFIED -> IN_MAINTENANCE -> SOLVED
    chain.set_state(fid, IN_MAINTENANCE)
    assert chain.failure_state(fid) == IN_MAINTENANCE
    chain.set_state(fid, SOLVED)
    assert chain.failure_state(fid) == SOLVED

    # illegal transition rejected
    with pytest.raises(Exception):
        chain.set_state(fid, IDENTIFIED)

    f = chain.get_failure(fid)
    assert f["reporter"].lower() == signers["uav-1"].address.lower()
    assert f["recognizerCount"] == 3
    assert f["x"] == 1000 and f["y"] == -2000 and f["z"] == 3000


def test_false_positive_path():
    chain = ShroudChain.local()
    chain.deploy()
    signers = uav_signers(1, [f"uav-{i}" for i in range(1, 6)])
    bid = chain.register_building("Distillation Tower C-2", "tower", b"\x00" * 32)
    chain.register_uavs([s.address for s in signers.values()])
    fid = chain.identify_failure(bid, 2, 0, 0, 0, b"\x01" * 32, "", signers["uav-1"])
    chain.submit_confirmation(fid, False, 10, signers["uav-2"])
    chain.submit_confirmation(fid, False, 10, signers["uav-3"])
    r = chain.submit_confirmation(fid, False, 10, signers["uav-4"])
    assert r["state"] == FALSE_POSITIVE


def test_unregistered_uav_rejected():
    chain = ShroudChain.local()
    chain.deploy()
    good = uav_signers(2, ["uav-1"])["uav-1"]
    rogue = uav_signers(999, ["rogue"])["rogue"]
    bid = chain.register_building("Pipe Rack PR-7", "pipe_rack", b"\x00" * 32)
    chain.register_uavs([good.address])
    # rogue UAV (not registered) cannot identify
    with pytest.raises(Exception):
        chain.identify_failure(bid, 3, 0, 0, 0, b"\x02" * 32, "", rogue)
