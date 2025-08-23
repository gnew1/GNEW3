
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * SubscriptionManager
 * - Planes con importe fijo por período (ERC20).
 * - Ancla opcional para prorrateo (e.g., primer día de mes UTC).
 * - Suscripción con grace period y límites de cobro por período.
 * - Cobros pull vía transferFrom (o permit off-chain antes del primer cargo).
 */
interface IERC20 {
  function transferFrom(address from, address to, uint256 amount) external returns (bool);
  function allowance(address owner, address spender) external view returns (uint256);
  function balanceOf(address account) external view returns (uint256);
  function decimals() external view returns (uint8);
}

contract SubscriptionManager {
  struct Plan {
    address merchant;
    address token;
    uint96 amountPerPeriod;     // en unidades del token
    uint32 periodSeconds;       // p. ej., 30d ≈ 30*86400
    uint32 anchorTimestamp;     // opcional: ancla para prorrateo; 0 = sin prorrateo
    bool active;
  }

  enum SubStatus { Active, Canceled }

  struct Subscription {
    uint256 planId;
    address subscriber;
    uint64 startAt;
    uint64 nextChargeAt;
    uint64 graceEndsAt;
    SubStatus status;
    uint32 charges; // número de cobros realizados
  }

  event PlanCreated(uint256 indexed planId, address indexed merchant, address token, uint96 amount, uint32 period, uint32 anchorTs);
  event PlanUpdated(uint256 indexed planId, bool active, uint96 newAmount);
  event Subscribed(uint256 indexed planId, address indexed subscriber, uint64 startAt, uint64 nextChargeAt, uint64 graceEndsAt);
  event Canceled(uint256 indexed planId, address indexed subscriber, uint64 at);
  event Charged(uint256 indexed planId, address indexed subscriber, uint256 amount, uint64 at);
  event ChargeFailed(uint256 indexed planId, address indexed subscriber, string reason, uint64 at);

  Plan[] public plans;
  // planId => subscriber => subscription
  mapping(uint256 => mapping(address => Subscription)) public subs;

  // límites de control
  uint32 public constant MAX_GRACE_SECONDS = 30 days;

  modifier onlyMerchant(uint256 planId) {
    require(plans[planId].merchant == msg.sender, "not merchant");
    _;
  }

  function createPlan(
    address token,
    uint96 amountPerPeriod,
    uint32 periodSeconds,
    uint32 anchorTimestamp
  ) external returns (uint256 planId) {
    require(amountPerPeriod > 0, "amount=0");
    require(periodSeconds >= 1 hours, "period too short");
    if (anchorTimestamp != 0) {
      require(anchorTimestamp < block.timestamp + 365 days, "anchor unreasonable");
    }
    plans.push(Plan({
      merchant: msg.sender,
      token: token,
      amountPerPeriod: amountPerPeriod,
      periodSeconds: periodSeconds,
      anchorTimestamp: anchorTimestamp,
      active: true
    }));
    planId = plans.length - 1;
    emit PlanCreated(planId, msg.sender, token, amountPerPeriod, periodSeconds, anchorTimestamp);
  }

  function updatePlan(uint256 planId, bool active, uint96 newAmount) external onlyMerchant(planId) {
    Plan storage p = plans[planId];
    p.active = active;
    if (newAmount != 0) p.amountPerPeriod = newAmount;
    emit PlanUpdated(planId, active, p.amountPerPeriod);
  }

  function subscriptionOf(uint256 planId, address subscriber) external view returns (Subscription memory) {
    return subs[planId][subscriber];
  }

  /// @notice Calcula el primer cargo prorrateado si el plan tiene ancla.
  function previewProratedFirst(uint256 planId, uint64 startAt) public view returns (uint256 proratedAmount) {
    Plan memory p = plans[planId];
    if (p.anchorTimestamp == 0) return p.amountPerPeriod;
    uint256 elapsedSinceAnchor = (startAt - p.anchorTimestamp) % p.periodSeconds;
    uint256 remaining = p.periodSeconds - elapsedSinceAnchor;
    proratedAmount = uint256(p.amountPerPeriod) * remaining / p.periodSeconds;
  }

  function subscribe(uint256 planId, uint32 graceSeconds, bool prorateFirst) external {
    Plan memory p = plans[planId];
    require(p.active, "plan inactive");
    require(graceSeconds <= MAX_GRACE_SECONDS, "grace too big");
    Subscription storage s = subs[planId][msg.sender];
    require(s.status == SubStatus(uint8(0)) ? true : s.status == SubStatus.Canceled, "already active");
    uint64 nowTs = uint64(block.timestamp);
    uint64 nextCharge = nowTs;
    // Si hay ancla y se desea prorrateo, cobramos inmediatamente la parte proporcional
    if (prorateFirst && p.anchorTimestamp != 0) {
      uint256 amount = previewProratedFirst(planId, nowTs);
      require(_charge(p, msg.sender, amount), "prorate charge failed");
      emit Charged(planId, msg.sender, amount, nowTs);
      nextCharge = nowTs + (uint64(p.periodSeconds) - (nowTs - uint64(p.anchorTimestamp)) % uint64(p.periodSeconds));
    } else {
      nextCharge = nowTs; // primer cobro puede ejecutarse ya
    }
    s.planId = planId;
    s.subscriber = msg.sender;
    s.startAt = nowTs;
    s.nextChargeAt = nextCharge;
    s.graceEndsAt = nextCharge + graceSeconds;
    s.status = SubStatus.Active;
    s.charges = 0;
    emit Subscribed(planId, msg.sender, s.startAt, s.nextChargeAt, s.graceEndsAt);
  }

  function cancel(uint256 planId) external {
    Subscription storage s = subs[planId][msg.sender];
    require(s.status == SubStatus.Active, "not active");
    s.status = SubStatus.Canceled;
    emit Canceled(planId, msg.sender, uint64(block.timestamp));
  }

  /// @notice Ejecuta un cargo cuando es debido. Puede llamarlo merchant, subscriber o un *keeper*.
  function charge(uint256 planId, address subscriber) external {
    Subscription storage s = subs[planId][subscriber];
    Plan memory p = plans[planId];
    require(p.active, "plan inactive");
    require(s.status == SubStatus.Active, "sub not active");
    uint64 nowTs = uint64(block.timestamp);
    require(nowTs >= s.nextChargeAt, "not due");
    require(nowTs <= s.graceEndsAt, "past grace");

    // Un cargo por período
    uint64 dueFrom = s.nextChargeAt;
    uint64 dueTo = dueFrom + p.periodSeconds;
    uint256 amount = p.amountPerPeriod;
    // safety: si el scheduler se retrasa dentro de la gracia, no cobramos más de 1 período
    if (nowTs > dueTo) {
      amount = p.amountPerPeriod; // sigue siendo 1x
    }

    bool ok = _charge(p, subscriber, amount);
    if (ok) {
      s.charges += 1;
      s.nextChargeAt = dueTo;                // siguiente período
      s.graceEndsAt = s.nextChargeAt + (s.graceEndsAt - dueFrom); // preserva la misma ventana de gracia
      emit Charged(planId, subscriber, amount, nowTs);
    } else {
      emit ChargeFailed(planId, subscriber, "token transfer failed", nowTs);
      revert("charge failed");
    }
  }

  function isDue(uint256 planId, address subscriber) external view returns (bool) {
    Subscription memory s = subs[planId][subscriber];
    return s.status == SubStatus.Active && block.timestamp >= s.nextChargeAt && block.timestamp <= s.graceEndsAt;
  }

  function _charge(Plan memory p, address from, uint256 amount) internal returns (bool) {
    // Requerimos allowance suficiente (o que el flujo use permit antes)
    if (IERC20(p.token).allowance(from, address(this)) < amount) return false;
    try IERC20(p.token).transferFrom(from, p.merchant, amount) returns (bool ok) {
      return ok;
    } catch {
      return false;
    }
  }
}


