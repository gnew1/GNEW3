package gnew.authz.v1 
 
test_allow_viewer_read() { 
  input := { 
    "subject": { "id": "u1", "roles": ["viewer"], "sanctions_status": 
"clear", "authenticated": true }, 
    "action": "read", 
    "resource": { "type": "doc", "owner": "u2", "sensitivity": "low", 
"region": "ES" }, 
    "env": { "ip_country": "ES", "mfa": "passed" } 
  } 
  resp := data.gnew.authz.v1.decision with input as input 
  resp.allow == true 
  count(resp.obligations) == 0 
} 
 
test_deny_blocked_by_sanctions() { 
  input := { 
    "subject": { "id": "u1", "roles": ["admin"], "sanctions_status": 
"blocked", "authenticated": true }, 
    "action": "manage", 
    "resource": { "type": "profile", "owner": "u1", "sensitivity": 
"low", "region": "ES" }, 
    "env": { "ip_country": "ES" } 
  } 
  resp := data.gnew.authz.v1.decision with input as input 
  resp.allow == false 
  resp.reason == "sanctions_blocked" 
} 
 
test_obligation_stepup_for_sensitive() { 
  input := { 
    "subject": { "id": "u1", "roles": ["editor"], "sanctions_status": 
"clear", "authenticated": true }, 
    "action": "write", 
    "resource": { "type": "doc", "owner": "u1", "sensitivity": "high", 
"region": "ES" }, 
    "env": { "ip_country": "ES", "mfa": "absent" } 
  } 
  resp := data.gnew.authz.v1.decision with input as input 
  resp.allow == true 
  resp.obligations[_] == "step_up_mfa" 
} 
 
