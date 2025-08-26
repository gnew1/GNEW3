// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.24; 
/** 
* @title StakingManager (GNEW) — N9 optimized 
* @notice Optimización de gas en rutas críticas: 
*  - **Custom errors** (reemplazan revert strings) 
*  - **Caching** de lecturas SLOAD y escrituras SSTORE 
*  - **Bitpacking** en structs (unbond sin `bool claimed`, packed en 
1 slot) 
*  - **unchecked** en contadores de loops 
*/ 
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol"; 
import {SafeERC20} from 
"@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; 
import {AccessControl} from 
"@openzeppelin/contracts/access/AccessControl.sol"; 
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol"; 
import {ReentrancyGuard} from 
"@openzeppelin/contracts/utils/ReentrancyGuard.sol"; 
contract StakingManager is AccessControl, Pausable, ReentrancyGuard { 
using SafeERC20 for IERC20; 
// ===== Custom errors (más baratas que strings) ===== 
error AmountZero(); 
error OperatorNotRegistered(); 
error InsufficientShares(); 
error NotReleased(); 
error InvalidBps(); 
    error Delay(); 
    error AppealPending(); 
    error NotStakeholder(); 
    error EmptyPool(); 
    error ZeroAddr(); 
 
    // -------- Roles -------- 
    bytes32 public constant PAUSER_ROLE   = keccak256("PAUSER_ROLE"); 
    bytes32 public constant SLASHER_ROLE  = keccak256("SLASHER_ROLE"); 
    bytes32 public constant APPEALS_ROLE  = keccak256("APPEALS_ROLE"); 
 
    // -------- Parámetros globales -------- 
    IERC20  public immutable stakingToken; 
    address public slashReceiver; 
    uint256 public minOperatorStake; 
    uint256 public unbondingWindow; 
    uint256 public slashDelay; 
 
    // -------- Datos por Operador -------- 
    struct Operator { 
        // `registered` se empaqueta junto a `slashNonce` en el mismo slot 
        uint248 slashNonce; // suficiente, evita ocupar un slot dedicado 
        bool    registered; // ocupa 1 byte en el mismo slot 
        uint256 totalStake; // slot propio 
        uint256 totalShares;// slot propio 
    } 
    mapping(address => Operator) public operators; 
 
    // -------- Posiciones por delegador -------- 
    /** 
     * Gas packing: una entrada se representa en **1 slot**: 
     *  - shares:   uint192  (hasta ~6e57 tokens con 18 dec) 
     *  - release:  uint64   (hasta año 584e9) 
     *  - usado:    uint8    (0 = no reclamado, 1 = reclamado) 
     */ 
    struct Unbonding { 
        uint192 shares; 
        uint64  releaseTime; 
        uint8   used; 
    } 
 
    struct Position { 
        uint256 activeShares; 
        Unbonding[] unbonds; 
    } 
 
    mapping(address => mapping(address => Position)) private 
positions; 
 
    // -------- Slashing -------- 
    enum AppealState { None, Open, Resolved } 
    struct SlashProposal { 
        uint64  id;              // cabe en 64 bits 
        uint16  bps;             // 0..10000 
        uint64  executeAfter;    // timestamp 
        bool    executed; 
        AppealState appeal; 
        bool    appealUpheld; 
        bytes32 evidence;        // hash 
    } 
    mapping(address => mapping(uint256 => SlashProposal)) public 
slashes; 
 
    // -------- Eventos -------- 
    event OperatorRegistered(address indexed operator); 
    event Delegated(address indexed delegator, address indexed 
operator, uint256 amount, uint256 shares); 
    event UndelegationRequested(address indexed delegator, address 
indexed operator, uint256 shares, uint64 releaseTime); 
    event UndelegationClaimed(address indexed delegator, address 
indexed operator, uint256 shares, uint256 payout); 
    event MisbehaviorReported(address indexed operator, bytes32 
indexed evidence); 
    event SlashProposed(address indexed operator, uint256 indexed id, 
uint256 bps, bytes32 evidence, uint64 executeAfter); 
    event SlashAppealed(address indexed operator, uint256 indexed id, 
address indexed by); 
    event SlashResolved(address indexed operator, uint256 indexed id, 
bool upheld); 
    event Slashed(address indexed operator, uint256 indexed id, 
uint256 amount, address receiver); 
    event ParamsUpdated(uint256 minOperatorStake, uint256 
unbondingWindow, uint256 slashDelay, address slashReceiver); 
 
    constructor( 
        address token_, 
        address admin_, 
        address slashReceiver_, 
        uint256 minOperatorStake_, 
        uint256 unbondingWindow_, 
        uint256 slashDelay_ 
    ) { 
        if (token_ == address(0) || admin_ == address(0) || 
slashReceiver_ == address(0)) revert ZeroAddr(); 
        stakingToken = IERC20(token_); 
        slashReceiver = slashReceiver_; 
        minOperatorStake = minOperatorStake_; 
        unbondingWindow = unbondingWindow_; 
        slashDelay = slashDelay_; 
 
        _grantRole(DEFAULT_ADMIN_ROLE, admin_); 
        _grantRole(PAUSER_ROLE, admin_); 
        _grantRole(SLASHER_ROLE, admin_); 
        _grantRole(APPEALS_ROLE, admin_); 
 
        emit ParamsUpdated(minOperatorStake, unbondingWindow, 
slashDelay, slashReceiver); 
    } 
 
    // ---------------- Admin ---------------- 
 
    function setParams( 
        uint256 minOperatorStake_, 
        uint256 unbondingWindow_, 
        uint256 slashDelay_, 
        address slashReceiver_ 
    ) external onlyRole(DEFAULT_ADMIN_ROLE) { 
        if (slashReceiver_ == address(0)) revert ZeroAddr(); 
        minOperatorStake = minOperatorStake_; 
        unbondingWindow = unbondingWindow_; 
        slashDelay = slashDelay_; 
        slashReceiver = slashReceiver_; 
        emit ParamsUpdated(minOperatorStake_, unbondingWindow_, 
slashDelay_, slashReceiver_); 
    } 
 
    function pause() external onlyRole(PAUSER_ROLE) { _pause(); } 
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); } 
 
    // ---------------- Core: Delegation ---------------- 
 
    function delegate(address operator, uint256 amount) external 
whenNotPaused nonReentrant { 
        if (amount == 0) revert AmountZero(); 
 
        Operator storage op = operators[operator]; 
 
        // Cache de estado 
        uint256 ts = op.totalStake; 
        uint256 tsh = op.totalShares; 
 
        // cálculo de shares 
        uint256 shares = (tsh == 0 || ts == 0) ? amount : (amount * 
tsh) / ts; 
    if (shares == 0) { unchecked { shares = 1; } } // evita bloqueo por redondeo 
 
    // Efectos 
    stakingToken.safeTransferFrom(msg.sender, address(this), amount); 
 
        // SSTORE mínimo: escribir una vez por campo 
        op.totalStake = ts + amount; 
        op.totalShares = tsh + shares; 
 
        // Registro del operador si alcanza mínimo 
        if (!op.registered && op.totalStake >= minOperatorStake) { 
            op.registered = true; 
            emit OperatorRegistered(operator); 
        } 
        if (!op.registered) revert OperatorNotRegistered(); 
 
        positions[operator][msg.sender].activeShares += shares; 
 
        emit Delegated(msg.sender, operator, amount, shares); 
    } 
 
    function undelegate(address operator, uint256 shares) external 
whenNotPaused { 
        if (shares == 0) revert AmountZero(); 
        Position storage p = positions[operator][msg.sender]; 
        uint256 act = p.activeShares; 
        if (act < shares) revert InsufficientShares(); 
        unchecked { p.activeShares = act - shares; } 
 
        uint64 releaseTime = uint64(block.timestamp + 
unbondingWindow); 
        p.unbonds.push(Unbonding({ 
            shares:     uint192(shares), 
            releaseTime: releaseTime, 
            used:        0 
        })); 
        emit UndelegationRequested(msg.sender, operator, shares, 
releaseTime); 
        // totalShares no cambia hasta claim -> preserva exchange rate 
    } 
 
    function claim(address operator, uint256 unbondIndex) external 
nonReentrant { 
        Position storage p = positions[operator][msg.sender]; 
    require(unbondIndex < p.unbonds.length, "index"); // infrecuente: mantener string OK 
 
        Unbonding storage u = p.unbonds[unbondIndex]; 
    if (u.used == 1) revert NotReleased(); // ya usado o nunca liberado 
    if (block.timestamp < u.releaseTime) revert NotReleased(); 
 
        Operator storage op = operators[operator]; 
        uint256 tsh = op.totalShares; 
        uint256 ts = op.totalStake; 
        if (tsh == 0 || ts == 0) revert EmptyPool(); 
 
        // payout = shares * totalStake / totalShares 
        uint256 shares = uint256(u.shares); 
        uint256 payout = (shares * ts) / tsh; 
 
        // Actualiza pool y entrada 
        op.totalShares = tsh - shares; 
        op.totalStake  = ts - payout; 
        u.used = 1; 
 
        stakingToken.safeTransfer(msg.sender, payout); 
        emit UndelegationClaimed(msg.sender, operator, shares, 
payout); 
    } 
 
    // ---------------- Slashing ---------------- 
 
    function reportMisbehavior(address operator, bytes32 evidence) 
external whenNotPaused { 
        emit MisbehaviorReported(operator, evidence); 
    } 
 
    function proposeSlash(address operator, uint256 bps, bytes32 
evidence) 
        external 
        onlyRole(SLASHER_ROLE) 
        whenNotPaused 
        returns (uint256 id) 
    { 
        if (bps == 0 || bps > 10_000) revert InvalidBps(); 
 
        Operator storage op = operators[operator]; 
        if (op.totalStake == 0) revert EmptyPool(); 
 
        // ++nonce (packed en el mismo slot que `registered`) 
        unchecked { op.slashNonce += 1; } 
        id = op.slashNonce; 
 
        uint64 executeAfter = uint64(block.timestamp + slashDelay); 
 
        slashes[operator][id] = SlashProposal({ 
            id:          uint64(id), 
            bps:         uint16(bps), 
            executeAfter: executeAfter, 
            executed:    false, 
            appeal:      AppealState.None, 
            appealUpheld:false, 
            evidence:    evidence 
        }); 
 
        emit SlashProposed(operator, id, bps, evidence, executeAfter); 
    } 
 
    function openAppeal(address operator, uint256 id) external 
whenNotPaused { 
        SlashProposal storage sp = slashes[operator][id]; 
        require(sp.id == id && !sp.executed, "invalid"); 
        if (sp.appeal != AppealState.None) revert AppealPending(); 
 
        // stakeholder: operador o delegador con posición 
        Position storage p = positions[operator][msg.sender]; 
        bool stakeholder = (msg.sender == operator) || (p.activeShares 
> 0); 
        if (!stakeholder) { 
            // busca unbonding no usado 
            Unbonding[] storage arr = p.unbonds; 
            for (uint256 i; i < arr.length;) { 
                if (arr[i].used == 0 && arr[i].shares > 0) { 
stakeholder = true; break; } 
                unchecked { ++i; } 
            } 
        } 
        if (!stakeholder) revert NotStakeholder(); 
 
        sp.appeal = AppealState.Open; 
        emit SlashAppealed(operator, id, msg.sender); 
    } 
 
    function resolveAppeal(address operator, uint256 id, bool uphold) 
        external 
        onlyRole(APPEALS_ROLE) 
        whenNotPaused 
    { 
        SlashProposal storage sp = slashes[operator][id]; 
        require(sp.id == id && !sp.executed, "invalid"); 
        require(sp.appeal == AppealState.Open, "appeal:not-open"); 
        sp.appeal = AppealState.Resolved; 
        sp.appealUpheld = uphold; 
        emit SlashResolved(operator, id, uphold); 
    } 
 
    function executeSlash(address operator, uint256 id) external 
whenNotPaused nonReentrant { 
        Operator storage op = operators[operator]; 
        SlashProposal storage sp = slashes[operator][id]; 
        require(sp.id == id && !sp.executed, "invalid"); 
        if (block.timestamp < sp.executeAfter) revert Delay(); 
        if (sp.appeal == AppealState.Open) revert AppealPending(); 
 
        if (sp.appeal == AppealState.Resolved && !sp.appealUpheld) { 
            sp.executed = true; 
            emit Slashed(operator, id, 0, slashReceiver); 
            return; 
        } 
 
        uint256 amount = (op.totalStake * sp.bps) / 10_000; 
        if (amount > 0) { 
            op.totalStake = op.totalStake - amount; 
            stakingToken.safeTransfer(slashReceiver, amount); 
        } 
        sp.executed = true; 
 
        emit Slashed(operator, id, amount, slashReceiver); 
    } 
 
    // ---------------- Views ---------------- 
 
    function operatorInfo(address operator) 
        external 
        view 
        returns (bool registered, uint256 totalStake, uint256 
totalShares, uint256 exchangeRateWad) 
    { 
        Operator storage op = operators[operator]; 
        registered = op.registered; 
        totalStake = op.totalStake; 
        totalShares = op.totalShares; 
        exchangeRateWad = (op.totalShares == 0) ? 0 : (op.totalStake * 
1e18) / op.totalShares; 
    } 
 
    function position(address operator, address delegator) 
        external 
        view 
        returns (uint256 activeShares, Unbonding[] memory unbonds) 
    { 
        Position storage p = positions[operator][delegator]; 
        activeShares = p.activeShares; 
        unbonds = p.unbonds; 
    } 
} 
 
