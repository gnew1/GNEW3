package gnew.treasury 
 
import future.keywords.in 
 
test_small_native_finops_weekday { 
  input := { 
    "initiator": {"address": "0xaa", "role": "FINANCE_OPS"}, 
    "tx": {"safe": "0xS", "to": "0xR", "valueWei": 
"100000000000000000", "token": null, "operation": 0}, 
    "context": {"chainId": 1, "fundKind": "operativo", "utcHour": 10, 
"weekday": 3, "threshold": 2, "currentApprovals": 1} 
  } 
  result := allow with input as input 
  result.allow 
} 
 
test_block_delegatecall { 
  input := { 
    "initiator": {"address": "0xaa", "role": "CFO"}, 
    "tx": {"safe": "0xS", "to": "0xR", "valueWei": "0", "token": null, 
"operation": 1}, 
    "context": {"chainId": 1, "fundKind": "operativo", "utcHour": 10, 
"weekday": 3, "threshold": 2, "currentApprovals": 1} 
  } 
  result := allow with input as input 
  not result.allow 
} 
 
 
