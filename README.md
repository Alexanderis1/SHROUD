# SHROUD

https://youtu.be/nVH184akhu4

**Cooperative UAV monitoring of critical infrastructure — CV/SAR defect detection, graph-theoretic task allocation, and Avalanche-tokenised, cooperatively-validated failure tracking.**

> A team of UAVs cooperatively and continuously inspects a critical-infrastructure asset (a refinery / tank farm) for damage, faults and unexpected conditions. Low-altitude UAVs use computer vision (EO/IR); high-altitude UAVs use synthetic-aperture radar (SAR) to see through poor light and weather. When any UAV recognises a candidate defect, its **position and image data are captured, tokenised on the Avalanche blockchain, and associated with the affected structure**. Other UAVs are then tasked to re-inspect it; once **≥ 3 distinct UAVs independently recognise it as real**, the failure is promoted to **verified damage**. An operator/client then drives the failure lifecycle: *identified → in&nbsp;maintenance → solved*.

`Python ≥3.11` · deterministic seeded simulation · real offscreen renders + real OpenCV detection · real Solidity on **Avalanche Fuji** · derived from the [COOP-UAV-S](https://github.com/Alexanderis1/COOP-UAV-S) cooperative-UAV framework · GPL-3.0

---

## The four elements

SHROUD is delivered as four cooperating elements (the first three are in this repository; the fourth is built by a partner against the contract ABI/event ICD we publish here):

| # | Element | Status | Basis |
|---|---|---|---|
| 1 | **Simulator** — deterministic, message-driven cooperative-robotics sim (world, UAV fleet, EO/IR + SAR sensors, edge CV, C2 coordination) | this repo (`src/shroud`) | COOP-UAV-S simulator |
| 2 | **Simulator interface** — Three.js dashboard: the refinery, the fleet, inspection coverage, candidate vs. verified defects, live on-chain state | this repo (`src/shroud/viz`) | COOP-UAV-S 3D console |
| 3 | **Blockchain** — Solidity `ShroudRegistry` on Avalanche Fuji: building registry + ERC-721 failure tokens + EIP-712 ≥3-UAV cooperative validation + operator lifecycle | this repo (`contracts/`, `src/shroud/chain`) | new |
| 4 | **Client interface** — operator dApp that reads chain state and drives *identified → in maintenance → solved* | **out of scope** (partner) — we ship the ABI, the event ICD ([docs/ICD_CHAIN.md](docs/ICD_CHAIN.md)) and a minimal headless reference client (`client/`) for end-to-end testing | new |

## On-chain validation model

```
UAV-A sees a candidate ──sign Identify (EIP-712)──▶ relayer ──▶ ShroudRegistry.identifyFailure()
                                                                   │ mints failure token #N, state = IDENTIFIED
                                                                   ▼
C2 tasks ≥2 other UAVs to re-inspect the same position (cooperative validation tasking)
   UAV-B, UAV-C each independently run CV ──sign Confirmation (EIP-712)──▶ relayer ──▶ submitConfirmation()
                                                                   │ counts DISTINCT registered UAV signers
                                                                   ▼ recognisers ≥ QUORUM(3)  →  state = VERIFIED
operator/client ──setState──▶ IN_MAINTENANCE ──▶ SOLVED
```

A confirmation is cryptographically attributable to a distinct UAV key (UAVs sign off-board; the relayer pays gas; the contract recovers the signer and counts distinct addresses). The reporter counts as recogniser #1, so two independent confirmations promote a candidate to verified damage.

## Quickstart

```bash
# 1 — env (uv-managed Python 3.12 venv recommended)
python -m venv .venv && . .venv/Scripts/activate    # or: uv venv --python 3.12
pip install -e ".[dev]"

# 2 — contract logic on a local deterministic EVM (no network needed)
pytest tests/test_contract.py -q

# 3 — deploy the real contract to Avalanche Fuji
python scripts/gen_key.py            # prints a deployer address; fund it at a Fuji faucet
python scripts/deploy.py --network fuji

# 4 — run the cooperative-inspection simulation end to end
shroud run scenarios/refinery_inspection.yaml --headless

# 5 — watch it in the dashboard
shroud serve                         # http://localhost:8000
```

## Architecture

A pub/sub `MessageBus` of typed dataclass messages, shaped 1:1 like ROS 2 topics — the same seam COOP-UAV-S uses, so a later ROS 2 / Gazebo migration replaces two small classes, not the mission code.

```
ground truth (sim side): refinery model + injected defects + weather + LOS occlusion
   │ 'defect/detections'  (EO/IR + SAR sensors render a real crop and run real CV at each viewpoint)
   ▼
C2 coordinator:  coverage graph + cooperative task allocation  ── 'inspect/tasks' ▶ UAVs
   │  on first detection → tokenise (chain)         ── 'validate/tasks' ▶ ≥3 UAVs to re-inspect
   ▼
chain bridge (web3 → Avalanche Fuji): identify → confirmations → verified → lifecycle
   │ 'chain/event'
   ▼
Recorder → recording JSON / live websocket → Three.js simulator interface
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design and [docs/ICD_CHAIN.md](docs/ICD_CHAIN.md) for the on-chain interface the client dApp consumes.

## Status

