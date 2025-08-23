
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * GNEW · N322 — Billing recurrente con AA (ERC-4337)
 * Rol: SC + Backend
 * Objetivo: Suscripciones automáticas con paymaster.
 * Stack on-chain: Solidity ^0.8.24, ERC-20, pull-payment con allowance o permit.
 * Entregables on-chain: Subscription.sol con alta/baja, prorrateo, idempotencia por ciclo, límites y eventos.
 * Seguridad & Observabilidad: ReentrancyGuard, caps por período, trazabilidad por eventos.
 *
 * Nota sobre Account Abstraction (ERC-4337):
 *  - El cobro (charge) es ejecutable por un "collector" autorizado (merchant u operador).
 *  - Para patrocinar gas (paymaster), el backend puede enviar el charge como UserOperation
 *    desde un smart account del collector con paymaster, sin cambios en este contrato.
 */

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Subscription is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum SubStatus {
        Active,
        Paused,
        Canceled
    }

    struct Plan {
        uint256 id;
        address merchant;
        IERC20 token;
        uint256 pricePerPeriod; // en unidades del token
        uint32 period; // segs (p.ej. 2592000 ≈ 30d)
        uint256 perPeriodCap; // límite máximo a cobrar por período (0 = sin tope)
        bool active;
        string metadata; // nombre/JSON
    }

    struct SubscriptionData {
        uint256 id;
        uint256 planId;
        address subscriber;
        uint64 startTs;
        uint64 nextChargeTs;
        uint32 cycleIndex; // número de ciclo ya cobrado (incrementa tras charge)
        SubStatus status;
        uint32 firstCycleProrationBps; // 0..10000 (solo aplica al primer cargo)
        uint256 credit; // saldo a favor (por prorrateos/cambios)
        uint256 arrears; // deuda acumulada por faltas de pago
    }

    uint256 private _planSeq;
    uint256 private _subSeq;

    mapping(uint256 => Plan) public plans; // planId => Plan
    mapping(uint256 => SubscriptionData) public subs; // subId => Subscription
    mapping(address => mapping(address => bool)) public collectorForMerchant; // merchant => operator => allowed
    mapping(uint256 => mapping(uint32 => bool)) public chargedCycle; // subId => cycleIndex => charged (idempotencia)

    event PlanCreated(uint256 indexed planId, address indexed merchant, address token, uint256 price, uint32 period, uint256 cap, string metadata);
    event PlanUpdated(uint256 indexed planId, bool active, uint256 newPrice, uint32 newPeriod, uint256 newCap, string metadata);
    event CollectorSet(address indexed merchant, address indexed operator, bool allowed);

    event Subscribed(uint256 indexed subId, uint256 indexed planId, address indexed subscriber, uint64 startTs, uint64 nextChargeTs, uint32 prorationBps);
    event Canceled(uint256 indexed subId, uint64 atTs);
    event Paused(uint256 indexed subId, uint64 atTs);
    event Resumed(uint256 indexed subId, uint64 atTs);

    event Charged(uint256 indexed subId, uint32 indexed cycleIndex, uint256 grossAmount, uint256 creditUsed, uint256 netPaid, uint256 arrearsAfter, uint64 atTs);
    event ChargeSkipped(uint256 indexed subId, uint32 indexed cycleIndex, string reason, uint64 atTs);

    modifier onlyCollector(uint256 subId) {
        SubscriptionData memory s = subs[subId];
        require(s.subscriber != address(0), "sub_not_found");
        Plan memory p = plans[s.planId];
        require(
            msg.sender == p.merchant || collectorForMerchant[p.merchant][msg.sender],
            "not_collector"
        );
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ----------------- Merchant / Admin -----------------

    function setCollector(address merchant, address operator, bool allowed) external {
        require(msg.sender == merchant || msg.sender == owner(), "not_merchant");
        collectorForMerchant[merchant][operator] = allowed;
        emit CollectorSet(merchant, operator, allowed);
    }

    function createPlan(
        IERC20 token,
        uint256 pricePerPeriod,
        uint32 periodSeconds,
        uint256 perPeriodCap,
        string calldata metadata
    ) external returns (uint256 planId) {
        require(address(token) != address(0), "token_zero");
        require(pricePerPeriod > 0, "price_zero");
        require(periodSeconds >= 60, "period_too_small");
        planId = ++_planSeq;
        plans[planId] = Plan({
            id: planId,
            merchant: msg.sender,
            token: token,
            pricePerPeriod: pricePerPeriod,
            period: periodSeconds,
            perPeriodCap: perPeriodCap,
            active: true,
            metadata: metadata
        });
        emit PlanCreated(planId, msg.sender, address(token), pricePerPeriod, periodSeconds, perPeriodCap, metadata);
    }

    function updatePlan(
        uint256 planId,
        bool active,
        uint256 newPrice,
        uint32 newPeriod,
        uint256 newCap,
        string calldata metadata
    ) external {
        Plan storage p = plans[planId];
        require(p.merchant == msg.sender || msg.sender == owner(), "not_merchant");
        if (newPrice > 0) p.pricePerPeriod = newPrice;
        if (newPeriod >= 60) p.period = newPeriod;
        p.perPeriodCap = newCap;
        p.active = active;
        p.metadata = metadata;
        emit PlanUpdated(planId, active, p.pricePerPeriod, p.period, p.perPeriodCap, metadata);
    }

    // ----------------- Subscriber -----------------

    /**
     * @param anchorTs Ancla de facturación histórica (p. ej. inicio de mes). Debe ser <= block.timestamp.
     * @param prorate Si true, el primer ciclo se prorratea por la fracción restante hasta completar el período desde el anchor.
     * El contrato cobra por pull-ERC20 (transferFrom). El usuario debe aprobar allowance suficiente (o usar permit off-chain).
     */
    function subscribe(
        uint256 planId,
        uint64 anchorTs,
        bool prorate
    ) external returns (uint256 subId) {
        Plan memory p = plans[planId];
        require(p.active, "plan_inactive");
        require(anchorTs <= block.timestamp, "bad_anchor");

        uint64 nowTs = uint64(block.timestamp);
        (uint64 nextTs, uint32 prorationBps) = _computeNextAndProration(p.period, anchorTs, nowTs, prorate);

        subId = ++_subSeq;
        subs[subId] = SubscriptionData({
            id: subId,
            planId: planId,
            subscriber: msg.sender,
            startTs: nowTs,
            nextChargeTs: nextTs,
            cycleIndex: 0,
            status: SubStatus.Active,
            firstCycleProrationBps: prorationBps,
            credit: 0,
            arrears: 0
        });

        emit Subscribed(subId, planId, msg.sender, nowTs, nextTs, prorationBps);
    }

    function cancel(uint256 subId) external {
        SubscriptionData storage s = subs[subId];
        require(s.subscriber != address(0), "sub_not_found");
        require(msg.sender == s.subscriber, "not_subscriber");
        s.status = SubStatus.Canceled;
        emit Canceled(subId, uint64(block.timestamp));
    }

    function pause(uint256 subId) external {
        SubscriptionData storage s = subs[subId];
        require(s.subscriber != address(0), "sub_not_found");
        require(msg.sender == s.subscriber, "not_subscriber");
        require(s.status == SubStatus.Active, "not_active");
        s.status = SubStatus.Paused;
        emit Paused(subId, uint64(block.timestamp));
    }

    function resume(uint256 subId) external {
        SubscriptionData storage s = subs[subId];
        require(s.subscriber != address(0), "sub_not_found");
        require(msg.sender == s.subscriber, "not_subscriber");
        require(s.status == SubStatus.Paused, "not_paused");
        s.status = SubStatus.Active;
        if (s.nextChargeTs < block.timestamp) {
            // reanudar: cobrar en el próximo tick
            s.nextChargeTs = uint64(block.timestamp);
        }
        emit Resumed(subId, uint64(block.timestamp));
    }

    // ----------------- Charging -----------------

    /**
     * Cobra un único ciclo si está vencido.
     * Idempotencia: no vuelve a cobrar si chargedCycle[subId][cycleIndex] ya fue marcado.
     * Fallbacks: si balance/allowance insuficiente, transfiere lo posible y registra arrears.
     */
    function chargeDue(uint256 subId) external nonReentrant onlyCollector(subId) {
        SubscriptionData storage s = subs[subId];
        Plan memory p = plans[s.planId];
        require(s.status == SubStatus.Active, "not_active");
        require(block.timestamp >= s.nextChargeTs, "not_due");

        uint32 cycle = s.cycleIndex + 1;
        if (chargedCycle[subId][cycle]) {
            emit ChargeSkipped(subId, cycle, "already_charged", uint64(block.timestamp));
            return; // idempotencia
        }

        // Calcula monto bruto para este ciclo (prorrateo en el primer ciclo)
        uint256 gross = p.pricePerPeriod;
        if (cycle == 1 && s.firstCycleProrationBps > 0 && s.firstCycleProrationBps < 10000) {
            gross = (gross * s.firstCycleProrationBps) / 10000;
        }
        if (p.perPeriodCap > 0 && gross > p.perPeriodCap) {
            gross = p.perPeriodCap;
        }

        // Aplica crédito si existe
        uint256 creditUsed = 0;
        if (s.credit > 0) {
            creditUsed = gross > s.credit ? s.credit : gross;
            s.credit -= creditUsed;
            gross -= creditUsed;
        }

        // Comprueba allowance/balance y transfiere lo posible
        IERC20 t = p.token;
        uint256 allowance = t.allowance(s.subscriber, address(this));
        uint256 bal = t.balanceOf(s.subscriber);
        uint256 payableAmount = _min(gross, _min(allowance, bal));

        uint256 arrearsAdd = 0;
        if (payableAmount < gross) {
            arrearsAdd = gross - payableAmount;
            s.arrears += arrearsAdd;
        }

        if (payableAmount > 0) {
            t.safeTransferFrom(s.subscriber, p.merchant, payableAmount);
        }

        chargedCycle[subId][cycle] = true;
        s.cycleIndex = cycle;
        s.nextChargeTs = uint64(uint256(s.nextChargeTs) + p.period);

        emit Charged(subId, cycle, gross + creditUsed, creditUsed, payableAmount, s.arrears, uint64(block.timestamp));
    }

    // ----------------- Views / Helpers -----------------

    function dueCycles(uint256 subId) external view returns (uint32 cycles) {
        SubscriptionData memory s = subs[subId];
        if (s.status != SubStatus.Active || s.subscriber == address(0)) return 0;
        Plan memory p = plans[s.planId];
        if (block.timestamp < s.nextChargeTs) return 0;
        uint256 diff = block.timestamp - s.nextChargeTs;
        cycles = 1 + uint32(diff / p.period);
    }

    function planOf(uint256 subId) external view returns (Plan memory) {
        return plans[subs[subId].planId];
    }

    // compute next charge ts and proration (bps)
    function _computeNextAndProration(uint32 period, uint64 anchorTs, uint64 nowTs, bool prorate)
        internal
        pure
        returns (uint64 nextTs, uint32 prorationBps)
    {
        uint256 elapsed = (nowTs - anchorTs) % period; // segundos desde el último límite de período
        uint256 remaining = period - elapsed;
        nextTs = nowTs + uint64(remaining);
        if (prorate) {
            prorationBps = uint32((remaining * 10000) / period);
            if (prorationBps > 10000) prorationBps = 10000;
        } else {
            prorationBps = 0;
        }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}


