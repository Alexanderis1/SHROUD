"""Avalanche blockchain bridge for SHROUD.

- ``compile``  : compile contracts/ShroudRegistry.sol with py-solc-x.
- ``eip712``   : reproduce the contract's EIP-712 domain / digests in Python
                 and sign them with a UAV key (the cooperative-validation seam).
- ``client``   : web3 wrapper — connect (local eth-tester or Avalanche Fuji),
                 deploy, register, identify, confirm, set-state, read events.
"""
