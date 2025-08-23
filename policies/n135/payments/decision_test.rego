package gnew.payments.v1 
 
test_allow_low_risk_under_limits() { 
  input := { 
    "tx": { "id":"t1", "amount": 50, "currency":"EUR", 
"country_from":"ES", "country_to":"FR" }, 
    "sender": { "id":"a", "sanctions_status":"clear", 
"daily_amount_eur": 100, "pep": false }, 
    "receiver": { "id":"b", "sanctions_status":"clear" }, 
    "risk": { "score": 0.2 } 
  } 
  d := data.gnew.payments.v1.decision with input as input 
  d.allow == true 
  count(d.obligations) == 0 
} 
 
test_block_sanctioned_wallet() { 
  input := { 
    "tx": { "id":"t2", "amount": 10, "currency":"EUR", 
"country_from":"ES", "country_to":"ES" }, 
    "sender": { "id":"a", "sanctions_status":"blocked", 
"daily_amount_eur": 0, "pep": false }, 
    "receiver": { "id":"b", "sanctions_status":"clear" }, 
    "risk": { "score": 0.1 } 
  } 
  d := data.gnew.payments.v1.decision with input as input 
  d.allow == false 
  d.reason == "sanctions_blocked_sender" 
} 
 
test_obligation_3ds_for_softlimit() { 
  input := { 
"tx": { "id":"t3", "amount": 1200, "currency":"EUR", 
"country_from":"ES", "country_to":"DE" }, 
"sender": { "id":"a", "sanctions_status":"clear", 
"daily_amount_eur": 0, "pep": false }, 
"receiver": { "id":"b", "sanctions_status":"clear" }, 
"risk": { "score": 0.3 } 
} 
d := data.gnew.payments.v1.decision with input as input 
d.allow == true 
d.obligations[_] == "3ds" 
} 
PDP (Policy Decision Point) 
