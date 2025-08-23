
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * GNEW · N322 — Billing recurrente con AA (ERC-4337)
 * Rol: SC + Backend
 * Objetivo: Suscripciones automáticas con paymaster.
 * Entregables: Subscription.sol (planes, alta/baja, prorrateo, fallbacks), eventos para panel.
 * Seguridad: límites, reentrancy guard, pausas, ownership mínima.
 *
 * Notas:
 * - Modelo pull sobre ERC20: el contrato cobra con transferFrom() desde el suscriptor al merchant.
 * - Idempotencia: charge() usa lastCharged y cap de tiempo [lastCharged, chargeUntil], por lo que llamadas repetidas no duplican cobro.
 * - Prorrateo: chargeUntil = min(block.timestamp, cancelAt o endAt si existe).
 * - Fallback: si transferFrom falla, la deuda queda registrada y puede reintentarse (debtOwed).
 */

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT;
    modifier nonReentrant() {
        require(_status != _ENTERED, "REENTRANCY");
        _status = _ENTERED;
        _;
        _status = _NOT;
    }
}

contract Subscription is ReentrancyGuard {
    // --- Ownership & Pausable ---
    address public owner;
    bool public paused;

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }
    modifier whenNotPaused() {
        require(!paused, "PAUSED");
        _;
    }

    // --- Data structures ---
    struct Plan {
        address merchant;      // receptor de pagos
        address token;         // ERC20
        uint96 ratePerSecond;  // precio por segundo en unidades del token (con decimales del token)
        uint32 minPeriod;      // mínimo en segundos para cancelar (opcional, 0 = libre)
        bool active;
    }

    struct Sub {
        uint256 planId;
        address user;
        uint64 startAt;
        uint64 lastChargedAt;  // frontera inferior de cobro
        uint64 cancelAt;       // si >0, no se cobra más allá de esta fecha
        uint128 debtOwed;      // acumulado que no pudo cobrarse (fallback)
        bool active;
    }

    uint256 public planCount;
    uint256 public subCount;

    mapping(uint256 => Plan) public plans;        // planId => Plan
    mapping(uint256 => Sub) public subs;          // subId => Sub
    mapping(address => uint256[]) public userSubs;// user => subIds (para panel off-chain)
    mapping(uint256 => uint256[]) public planSubs;// planId => subIds

    // --- Limits ---
    uint256 public maxSecondsPerCharge = 31 days; // límite de cobro por llamada para evitar overflows
    uint256 public maxBatch = 50;                 // límite de iteraciones en batchCharge()

    // --- Events ---
    event PlanCreated(uint256 indexed planId, address indexed merchant, address token, uint96 ratePerSecond, uint32 minPeriod);
    event PlanToggled(uint256 indexed planId, bool active);
    event Subscribed(uint256 indexed subId, uint256 indexed planId, address indexed user, uint64 startAt);
    event CancelRequested(uint256 indexed subId, uint64 cancelAt);
    event Charged(
        uint256 indexed subId,
        uint256 amount,
        uint64 fromTs,
        uint64 toTs,
        bool success,
        uint128 newDebt
    );
    event DebtSettled(uint256 indexed subId, uint256 paid, uint128 remainingDebt);

    constructor() {
        owner = msg.sender;
    }

    // --- Admin ---
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO");
        owner = newOwner;
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
    }

    function setLimits(uint256 _maxSecondsPerCharge, uint256 _maxBatch) external onlyOwner {
        require(_maxSecondsPerCharge > 0 && _maxBatch > 0, "INVALID");
        maxSecondsPerCharge = _maxSecondsPerCharge;
        maxBatch = _maxBatch;
    }

    // --- Plans ---
    function createPlan(address merchant, address token, uint96 ratePerSecond, uint32 minPeriod) external onlyOwner returns (uint256 planId) {
        require(merchant != address(0) && token != address(0), "ZERO_ADDR");
        require(ratePerSecond > 0, "ZERO_RATE");
        planId = ++planCount;
        plans[planId] = Plan({
            merchant: merchant,
            token: token,
            ratePerSecond: ratePerSecond,
            minPeriod: minPeriod,
            active: true
        });
        emit PlanCreated(planId, merchant, token, ratePerSecond, minPeriod);
    }

    function setPlanActive(uint256 planId, bool active) external onlyOwner {
        require(planId > 0 && planId <= planCount, "PLAN_NOT_FOUND");
        plans[planId].active = active;
        emit PlanToggled(planId, active);
    }

    // --- Subscriptions ---
    function subscribe(uint256 planId) external whenNotPaused returns (uint256 subId) {
        Plan memory p = plans[planId];
        require(p.active, "PLAN_INACTIVE");
        subId = ++subCount;
        subs[subId] = Sub({
            planId: planId,
            user: msg.sender,
            startAt: uint64(block.timestamp),
            lastChargedAt: uint64(block.timestamp),
            cancelAt: 0,
            debtOwed: 0,
            active: true
        });
        userSubs[msg.sender].push(subId);
        planSubs[planId].push(subId);
        emit Subscribed(subId, planId, msg.sender, uint64(block.timestamp));
    }

    function requestCancel(uint256 subId) external whenNotPaused {
        Sub storage s = subs[subId];
        require(s.user == msg.sender || msg.sender == owner, "FORBIDDEN");
        require(s.active, "NOT_ACTIVE");
        // Respetar minPeriod
        Plan storage p = plans[s.planId];
        uint64 earliest = s.startAt + p.minPeriod;
        uint64 effectiveCancel = uint64(block.timestamp) >= earliest ? uint64(block.timestamp) : earliest;
        s.cancelAt = effectiveCancel;
        s.active = false; // no admitir más prórrogas
        emit CancelRequested(subId, effectiveCancel);
    }

    function computeOwed(uint256 subId) public view returns (uint256 amount, uint64 fromTs, uint64 toTs) {
        Sub storage s = subs[subId];
        require(s.user != address(0), "SUB_NOT_FOUND");
        Plan storage p = plans[s.planId];
        fromTs = s.lastChargedAt;
        uint64 cap = s.cancelAt > 0 ? s.cancelAt : uint64(block.timestamp);
        // Límite de ventana para evitar cobros gigantes
        uint64 maxTo = uint64(fromTs + uint64(maxSecondsPerCharge));
        toTs = cap < maxTo ? cap : maxTo;
        if (toTs <= fromTs) return (0, fromTs, toTs);
        uint256 secondsElapsed = uint256(toTs - fromTs);
        amount = secondsElapsed * uint256(p.ratePerSecond);
    }

    function charge(uint256 subId) external whenNotPaused nonReentrant returns (uint256 amount) {
        (amount, uint64 fromTs, uint64 toTs) = computeOwed(subId);
        Sub storage s = subs[subId];
        Plan storage p = plans[s.planId];

        // Si no hay nada que cobrar, retorno temprano (idempotencia)
        if (amount == 0) {
            emit Charged(subId, 0, fromTs, toTs, true, s.debtOwed);
            return 0;
        }

        // Intento cobrar deuda previa + monto actual
        uint256 total = amount + uint256(s.debtOwed);
        bool ok = _collect(p.token, s.user, p.merchant, total);

        if (ok) {
            // liquidó todo
            s.debtOwed = 0;
            s.lastChargedAt = toTs;
            emit Charged(subId, total, fromTs, toTs, true, 0);
        } else {
            // intenta cobrar sólo el período actual; si tampoco, acumula deuda
            bool okCurrent = _collect(p.token, s.user, p.merchant, amount);
            if (okCurrent) {
                s.lastChargedAt = toTs;
                // deuda previa permanece
                emit Charged(subId, amount, fromTs, toTs, true, s.debtOwed);
            } else {
                // no se pudo cobrar, toda la cantidad va a deuda
                s.debtOwed += uint128(amount);
                emit Charged(subId, 0, fromTs, toTs, false, s.debtOwed);
            }
        }
        return amount;
    }

    function settleDebt(uint256 subId, uint256 maxAmount) external whenNotPaused nonReentrant returns (uint256 paid) {
        Sub storage s = subs[subId];
        Plan storage p = plans[s.planId];
        uint256 due = s.debtOwed;
        if (due == 0) {
            emit DebtSettled(subId, 0, 0);
            return 0;
        }
        uint256 toPay = maxAmount < due ? maxAmount : due;
        bool ok = _collect(p.token, s.user, p.merchant, toPay);
        if (ok) {
            s.debtOwed = uint128(due - toPay);
            emit DebtSettled(subId, toPay, s.debtOwed);
            return toPay;
        } else {
            emit DebtSettled(subId, 0, s.debtOwed);
            return 0;
        }
    }

    function _collect(address token, address from, address to, uint256 amount) internal returns (bool) {
        if (amount == 0) return true;
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        return success && (data.length == 0 || abi.decode(data, (bool)));
    }

    // --- Helpers para panel ---
    function getUserSubs(address user) external view returns (uint256[] memory) {
        return userSubs[user];
    }

    function getPlanSubs(uint256 planId) external view returns (uint256[] memory) {
        return planSubs[planId];
    }
}


