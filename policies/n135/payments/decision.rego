package gnew.payments.v1 
 
default allow := false 
default reason := "default_deny" 
default obligations := [] 
 
# input: 
# { 
#   "tx": { "id":"...", "amount": 123.45, "currency":"EUR", 
"country_from":"ES", "country_to":"FR" }, 
#   "sender": { "id":"subj_a", "sanctions_status":"clear", 
"daily_amount_eur": 500, "pep": false }, 
#   "receiver": { "id":"subj_b", "sanctions_status":"clear" }, 
#   "risk": { "score": 0.42, "device_trust":"high", "velocity_1h": 2 
}, 
#   "env": { "now": "2025-08-19T12:34:00Z" } 
# } 
deny_sanctions_sender { input.sender.sanctions_status == "blocked" } 
deny_sanctions_receiver { input.receiver.sanctions_status == "blocked" 
} 
reason := "sanctions_blocked_sender" { deny_sanctions_sender } 
reason := "sanctions_blocked_receiver" { deny_sanctions_receiver } 
# País embargado 
deny_embargo_from { input.tx.country_from == 
data.gnew.embargo_countries[_] } 
deny_embargo_to   { input.tx.country_to   == 
data.gnew.embargo_countries[_] } 
reason := "embargo_country" { deny_embargo_from } { deny_embargo_to } 
# Límites 
hard_limit_violation { 
to_eur(input.tx.amount, input.tx.currency) > 
data.gnew.payments.hard_limit_eur 
} 
reason := "over_hard_limit" { hard_limit_violation } 
daily_limit_violation { 
input.sender.daily_amount_eur + to_eur(input.tx.amount, 
input.tx.currency) > data.gnew.payments.daily_sender_limit_eur 
} 
reason := "over_daily_limit" { daily_limit_violation } 
# Umbrales de riesgo 
risk_allow { input.risk.score <= 
data.gnew.payments.risk_threshold_allow } 
risk_review { input.risk.score > 
data.gnew.payments.risk_threshold_allow 
input.risk.score <= 
data.gnew.payments.risk_threshold_review } 
risk_block { input.risk.score > 
data.gnew.payments.risk_threshold_review } 
reason := "high_risk_block" { risk_block } 
# Obligaciones 
obligations contains "3ds" { risk_review }          
# step-up pago 
obligations contains "manual_review" { input.sender.pep == true } # 
PEP → revisión manual 
obligations contains "3ds" { to_eur(input.tx.amount, 
input.tx.currency) > data.gnew.payments.soft_limit_eur } 
# Decisión final 
allow { 
not deny_sanctions_sender 
not deny_sanctions_receiver 
not deny_embargo_from 
not deny_embargo_to 
not hard_limit_violation 
not daily_limit_violation 
not risk_block 
} 
# Conversión simple (stub; en prod usar FX real) 
to_eur(amount, currency) = eur { 
some rate 
rate := fx_rate(currency) 
eur := amount * rate 
} 
fx_rate("EUR") = 1 
fx_rate("USD") = 0.9 
fx_rate("GBP") = 1.15 
fx_rate(_) = 1 
decision := { 
"allow": allow, 
  "reason": reason, 
  "obligations": obligations 
} 
 
