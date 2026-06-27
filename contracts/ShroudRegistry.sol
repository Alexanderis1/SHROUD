// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.19;

/// @title SHROUD Registry — buildings + cooperatively-validated failure tokens
/// @notice Deterministic on-chain source of truth for a cooperative-UAV
///         infrastructure-monitoring system (SHROUD). Buildings (infrastructure
///         structures) are registered by the operator. When a UAV identifies a
///         candidate defect it mints an ERC-721 "failure token" carrying the
///         defect's position and image hash. Other UAVs re-inspect and submit
///         EIP-712-signed confirmations; once >= QUORUM distinct UAVs recognise
///         the failure it becomes VERIFIED. The operator (client dApp) then
///         drives the lifecycle: VERIFIED -> IN_MAINTENANCE -> SOLVED.
///
/// Self-contained, minimal-but-compliant ERC-721 (no external imports) so it
/// compiles with py-solc-x in one shot and deploys as-is to Avalanche
/// C-Chain / Fuji (chainId 43113).
contract ShroudRegistry {
    // ----- failure lifecycle (mirrors shroud.core.messages.FailureState) -----
    enum State { NONE, IDENTIFIED, VERIFIED, IN_MAINTENANCE, SOLVED, FALSE_POSITIVE }

    /// Distinct UAVs that must recognise a failure (reporter counts as #1).
    uint8 public constant QUORUM = 3;

    // --------------------------------- types ---------------------------------
    struct Building {
        string name;          // human label, e.g. "Crude Tank T-101"
        string structureType; // "tank" | "tower" | "pipe_rack" | "flare" | ...
        bytes32 geoHash;      // hash of the structure's georeferenced footprint
        bool exists;
    }

    struct Failure {
        uint256 buildingId;
        uint8 defectType;     // shroud.core.messages.DefectType
        int256 x;             // world position, millimetres
        int256 y;
        int256 z;
        bytes32 imageHash;    // sha256 of the tokenised image crop
        string imageURI;      // off-chain pointer (ipfs:// or run-local path)
        address reporter;     // UAV that first identified it
        State state;
        uint8 recognizerCount;// distinct UAVs that confirmed it is real
        uint8 rejectCount;    // distinct UAVs that judged it a false claim
        uint64 identifiedAt;  // block timestamp
    }

    // --------------------------------- storage -------------------------------
    address public owner;                 // operator / client dApp role
    uint256 public buildingCount;
    uint256 public failureCount;          // also the ERC-721 tokenId high-water
    uint256 public uavCount;

    mapping(uint256 => Building) public buildings;
    mapping(uint256 => Failure) private _failures;
    mapping(address => bool) public isUav; // authorised UAV signer set
    // failureId => UAV => 0 unseen, 1 confirmed-real, 2 rejected
    mapping(uint256 => mapping(address => uint8)) public recognition;

    // ----- minimal ERC-721 -----
    string public constant name = "SHROUD Failure";
    string public constant symbol = "SHRD";
    string private _baseURI = "shroud://failure/";
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // ----- EIP-712 -----
    bytes32 private constant _EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant _CONFIRM_TYPEHASH =
        keccak256("Confirmation(uint256 failureId,bool verdict,uint8 confidence)");
    bytes32 private constant _IDENTIFY_TYPEHASH =
        keccak256("Identify(uint256 buildingId,uint8 defectType,bytes32 imageHash,int256 x,int256 y,int256 z)");
    bytes32 public immutable DOMAIN_SEPARATOR;

    // --------------------------------- events --------------------------------
    event BuildingRegistered(uint256 indexed buildingId, string name, string structureType);
    event UavRegistered(address indexed uav);
    event FailureIdentified(
        uint256 indexed failureId, uint256 indexed buildingId, address indexed reporter,
        uint8 defectType, bytes32 imageHash);
    event FailureConfirmed(uint256 indexed failureId, address indexed uav, uint8 recognizerCount);
    event FailureRejectedVote(uint256 indexed failureId, address indexed uav, uint8 rejectCount);
    event FailureVerified(uint256 indexed failureId, uint256 indexed buildingId);
    event StateChanged(uint256 indexed failureId, State oldState, State newState);
    // ERC-721
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner_, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner_, address indexed operator, bool approved);

    // ----- custom errors -----
    error NotOwner();
    error NotUav();
    error BadBuilding();
    error BadFailure();
    error BadState();
    error AlreadyVoted();
    error ReporterCannotConfirm();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            _EIP712_DOMAIN_TYPEHASH,
            keccak256(bytes("SHROUD")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    // ============================= admin =====================================
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function registerBuilding(string calldata name_, string calldata structureType_, bytes32 geoHash)
        external onlyOwner returns (uint256 id)
    {
        id = ++buildingCount;
        buildings[id] = Building(name_, structureType_, geoHash, true);
        emit BuildingRegistered(id, name_, structureType_);
    }

    function registerUav(address uav) public onlyOwner {
        if (!isUav[uav]) {
            isUav[uav] = true;
            uavCount += 1;
            emit UavRegistered(uav);
        }
    }

    function registerUavs(address[] calldata uavs) external onlyOwner {
        for (uint256 i = 0; i < uavs.length; i++) registerUav(uavs[i]);
    }

    // ====================== identify (mint) ==================================
    /// @notice Relayer-submitted, UAV-signed identification of a new candidate
    ///         failure. The reporter UAV signs the EIP-712 `Identify` struct;
    ///         the contract recovers it and mints the token (owned by the
    ///         operator, who manages the lifecycle).
    function identifyFailure(
        uint256 buildingId,
        uint8 defectType,
        int256 x, int256 y, int256 z,
        bytes32 imageHash,
        string calldata imageURI,
        bytes calldata reporterSig
    ) external returns (uint256 failureId) {
        if (!buildings[buildingId].exists) revert BadBuilding();
        bytes32 structHash = keccak256(abi.encode(
            _IDENTIFY_TYPEHASH, buildingId, defectType, imageHash, x, y, z));
        address reporter = _recover(structHash, reporterSig);
        if (!isUav[reporter]) revert NotUav();

        failureId = ++failureCount;
        _failures[failureId] = Failure({
            buildingId: buildingId,
            defectType: defectType,
            x: x, y: y, z: z,
            imageHash: imageHash,
            imageURI: imageURI,
            reporter: reporter,
            state: State.IDENTIFIED,
            recognizerCount: 1,            // reporter is recogniser #1
            rejectCount: 0,
            identifiedAt: uint64(block.timestamp)
        });
        recognition[failureId][reporter] = 1;
        _mint(owner, failureId);
        emit FailureIdentified(failureId, buildingId, reporter, defectType, imageHash);
        emit StateChanged(failureId, State.NONE, State.IDENTIFIED);
    }

    // ====================== cooperative validation ===========================
    /// @notice Relayer-submitted, UAV-signed verdict on a candidate. A `true`
    ///         verdict from a distinct, non-reporter UAV counts toward the
    ///         verification quorum; `false` counts toward false-positive.
    function submitConfirmation(
        uint256 failureId,
        bool verdict,
        uint8 confidence,
        bytes calldata sig
    ) external {
        Failure storage f = _failures[failureId];
        if (f.state != State.IDENTIFIED) revert BadState();
        bytes32 structHash = keccak256(abi.encode(_CONFIRM_TYPEHASH, failureId, verdict, confidence));
        address uav = _recover(structHash, sig);
        if (!isUav[uav]) revert NotUav();
        if (uav == f.reporter) revert ReporterCannotConfirm();
        if (recognition[failureId][uav] != 0) revert AlreadyVoted();

        if (verdict) {
            recognition[failureId][uav] = 1;
            f.recognizerCount += 1;
            emit FailureConfirmed(failureId, uav, f.recognizerCount);
            if (f.recognizerCount >= QUORUM) {
                State old = f.state;
                f.state = State.VERIFIED;
                emit FailureVerified(failureId, f.buildingId);
                emit StateChanged(failureId, old, State.VERIFIED);
            }
        } else {
            recognition[failureId][uav] = 2;
            f.rejectCount += 1;
            emit FailureRejectedVote(failureId, uav, f.rejectCount);
            if (f.rejectCount >= QUORUM) {
                State old = f.state;
                f.state = State.FALSE_POSITIVE;
                emit StateChanged(failureId, old, State.FALSE_POSITIVE);
            }
        }
    }

    // ====================== operator lifecycle ===============================
    /// @notice Operator/client lifecycle control. Enforces a sane transition
    ///         graph so the dashboard state cannot jump arbitrarily.
    function setState(uint256 failureId, State newState) external onlyOwner {
        Failure storage f = _failures[failureId];
        if (f.state == State.NONE) revert BadFailure();
        State cur = f.state;
        bool ok =
            (cur == State.VERIFIED && (newState == State.IN_MAINTENANCE || newState == State.FALSE_POSITIVE)) ||
            (cur == State.IN_MAINTENANCE && (newState == State.SOLVED || newState == State.VERIFIED)) ||
            (cur == State.IDENTIFIED && newState == State.FALSE_POSITIVE) ||
            (cur == State.SOLVED && newState == State.IN_MAINTENANCE);  // reopen
        if (!ok) revert BadState();
        f.state = newState;
        emit StateChanged(failureId, cur, newState);
    }

    // ============================== views ====================================
    function getFailure(uint256 failureId) external view returns (Failure memory) {
        if (_failures[failureId].state == State.NONE) revert BadFailure();
        return _failures[failureId];
    }

    function failureState(uint256 failureId) external view returns (State) {
        return _failures[failureId].state;
    }

    function isVerified(uint256 failureId) external view returns (bool) {
        State s = _failures[failureId].state;
        return s == State.VERIFIED || s == State.IN_MAINTENANCE || s == State.SOLVED;
    }

    // ====================== EIP-712 / ECDSA ==================================
    function digestConfirmation(uint256 failureId, bool verdict, uint8 confidence)
        external view returns (bytes32)
    {
        bytes32 structHash = keccak256(abi.encode(_CONFIRM_TYPEHASH, failureId, verdict, confidence));
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }

    function digestIdentify(
        uint256 buildingId, uint8 defectType, bytes32 imageHash, int256 x, int256 y, int256 z
    ) external view returns (bytes32) {
        bytes32 structHash = keccak256(abi.encode(
            _IDENTIFY_TYPEHASH, buildingId, defectType, imageHash, x, y, z));
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
    }

    function _recover(bytes32 structHash, bytes calldata sig) internal view returns (address) {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        if (sig.length != 65) return address(0);
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s);
    }

    // ======================= minimal ERC-721 =================================
    function balanceOf(address a) external view returns (uint256) { return _balanceOf[a]; }

    function ownerOf(uint256 tokenId) public view returns (address o) {
        o = _ownerOf[tokenId];
        require(o != address(0), "no token");
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf[tokenId] != address(0), "no token");
        return string(abi.encodePacked(_baseURI, _toString(tokenId)));
    }

    function setBaseURI(string calldata base) external onlyOwner { _baseURI = base; }

    function approve(address to, uint256 tokenId) external {
        address o = ownerOf(tokenId);
        require(msg.sender == o || _operatorApprovals[o][msg.sender], "not authorised");
        _tokenApprovals[tokenId] = to;
        emit Approval(o, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(_ownerOf[tokenId] != address(0), "no token");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address o, address operator) external view returns (bool) {
        return _operatorApprovals[o][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(to != address(0), "zero to");
        address o = ownerOf(tokenId);
        require(o == from, "wrong from");
        require(
            msg.sender == o || _tokenApprovals[tokenId] == msg.sender || _operatorApprovals[o][msg.sender],
            "not authorised"
        );
        delete _tokenApprovals[tokenId];
        _balanceOf[from] -= 1;
        _balanceOf[to] += 1;
        _ownerOf[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        transferFrom(from, to, tokenId);
        if (to.code.length > 0) {
            require(
                IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data)
                    == IERC721Receiver.onERC721Received.selector,
                "bad receiver"
            );
        }
    }

    function supportsInterface(bytes4 iid) external pure returns (bool) {
        return iid == 0x01ffc9a7 ||  // ERC165
               iid == 0x80ac58cd ||  // ERC721
               iid == 0x5b5e139f;    // ERC721Metadata
    }

    function _mint(address to, uint256 tokenId) internal {
        require(_ownerOf[tokenId] == address(0), "exists");
        _balanceOf[to] += 1;
        _ownerOf[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
    }

    function _toString(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 j = v;
        uint256 len;
        while (j != 0) { len++; j /= 10; }
        bytes memory b = new bytes(len);
        while (v != 0) { len -= 1; b[len] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }
}

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external returns (bytes4);
}
