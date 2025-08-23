package gnew.treasury 
default allow = {"allow": false, "reasons": ["no decision"]} 
# ------------------------------ 
# Parameters / limits (tune here) 
# ------------------------------ 
time_window = {"start": 8, "end": 20} # UTC business hours 
# Native ETH daily role-based max (in Wei) 
native_limits = { 
"operativo": {"FINANCE_OPS": 50_000000000000000000, "CFO": 
200_000000000000000000, "EXEC": 500_000000000000000000}, 
"grants":    
{"GRANTS_LEAD": 30_000000000000000000, "CFO": 
150_000000000000000000, "EXEC": 300_000000000000000000}, 
"rnd":       
{"RND_LEAD":    
40_000000000000000000, "CFO": 
150_000000000000000000, "EXEC": 300_000000000000000000} 
} 
# Require extra approvals (beyond threshold) above X (optional) 
extra_approval_threshold_wei = 200_000000000000000000 
# Block delegatecall by default 
forbid_delegatecall = true 
# Trusted token transfers allowed? (example: map token -> allowed) 
trusted_tokens = {} 
# ------------------------------ 
# Helpers 
# ------------------------------ 
role := lower(input.initiator.role) if input.initiator.role 
fund := input.context.fundKind 
is_business_hour { 
input.context.utcHour >= time_window.start 
input.context.utcHour < time_window.end 
} 
is_weekday { 
input.context.weekday >= 1 
input.context.weekday <= 5 
} 
is_native { input.tx.token == null } 
is_delegatecall { input.tx.operation == 1 } 
value_wei := to_number(input.tx.valueWei) 
max_for_role := native_limits[fund][upper(role)] if is_native 
enough_approvals { 
# currentApprovals represent confirmations already dadas a la 
propuesta. 
input.context.currentApprovals >= input.context.threshold - 1 
} 
needs_extra_approval { 
is_native 
value_wei > extra_approval_threshold_wei 
} 
# ------------------------------ 
# Decision 
# ------------------------------ 
allow := out { 
reasons := [] 
# Block delegatecall unless explicitly allowed 
forbid_delegatecall 
is_delegatecall 
  out := {"allow": false, "reasons": array.concat(reasons, 
["delegatecall forbidden"])} 
 
} else := out { 
  reasons := [] 
 
  # Enforce business hours + weekdays for non-EXEC roles 
  not role == "exec" 
  not is_business_hour 
  out := {"allow": false, "reasons": array.concat(reasons, ["outside 
business hours"])} 
 
} else := out { 
  reasons := [] 
  not role == "exec" 
  not is_weekday 
  out := {"allow": false, "reasons": array.concat(reasons, ["weekend 
not allowed"])} 
} else := out { 
  reasons := [] 
 
  # Native transfer limits by role & fund 
  is_native 
  max_for_role 
  value_wei > max_for_role 
  out := {"allow": false, "reasons": array.concat(reasons, ["amount 
exceeds role limit"])} 
} else := out { 
  # ERC20 path (example basic rule: deny unless token whitelisted) 
  not is_native 
  not trusted_tokens[input.tx.token] 
  out := {"allow": false, "reasons": ["untrusted token"]} 
} else := out { 
  # Approvals logic: require at least threshold; optionally >threshold 
for big amounts 
  need_more := needs_extra_approval 
  has_min := enough_approvals 
 
  # If big transfer, require at least threshold confirmations already 
(the rest ensured on-chain by Safe threshold) 
  need_more 
  not has_min 
  out := {"allow": false, "reasons": ["insufficient pre-approvals for 
large amount"], "requiredSigners": input.context.threshold} 
} else := out { 
  # All checks pass 
  out := {"allow": true} 
} 
 
 
