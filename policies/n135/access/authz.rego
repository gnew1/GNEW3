package gnew.authz.v1 
 
default allow := false 
default reason := "default_deny" 
default obligations := [] 
# Entrada esperada: 
# input = { 
#   "subject": { "id":"subj_x", "roles":["viewer","..."], 
"sanctions_status":"clear|review|blocked" }, 
#   "action": "read|write|manage", 
#   "resource": { "type":"doc|payment|profile", "owner":"subj_y", 
"sensitivity":"low|medium|high", "region":"EU|US|BR" }, 
#   "env": { "ip_country":"ES", "mfa":"passed|absent" } 
# } 
# Bloqueo por sanciones 
deny_sanctions { 
input.subject.sanctions_status == "blocked" 
} 
reason := "sanctions_blocked" { deny_sanctions } 
# País embargado (origen IP o región del recurso) 
deny_embargo { 
some c 
c := input.env.ip_country 
c != "" 
c == data.gnew.embargo_countries[_] 
} 
reason := "embargo_country" { deny_embargo } 
# Autenticación requerida 
deny_unauthenticated { 
not input.subject.authenticated 
} 
reason := "unauthenticated" { deny_unauthenticated } 
# Autorización por rol ↔ acción 
allow { 
not deny_sanctions 
not deny_embargo 
not deny_unauthenticated 
input.action == data.gnew.roles[_][_] 
role_allows_action 
resource_rules_ok 
} 
role_allows_action { 
some r 
r := input.subject.roles[_] 
data.gnew.roles[r][_] == input.action 
} 
# Reglas de recurso (ejemplos): 
# Propietario siempre puede 'read' su propio profile 
allow { 
input.resource.type == "profile" 
input.action == "read" 
input.resource.owner == input.subject.id 
} 
# Datos sensibles → exigir MFA (obligación) 
obligations contains "step_up_mfa" { 
input.resource.sensitivity == "high" 
input.env.mfa != "passed" 
} 
# Gestión ('manage') sólo admin 
deny_manage_without_admin { 
input.action == "manage" 
not some { r := input.subject.roles[_]; r == "admin" } 
} 
reason := "manage_requires_admin" { deny_manage_without_admin } 
# Reglas de región (ejemplo): 'write' sólo si recurso.region == 
env.ip_country (simplificado) 
region_write_gate { 
input.action == "write" 
  input.resource.region != "" 
  lower(input.resource.region) == lower(input.env.ip_country) 
} 
resource_rules_ok { 
  input.action != "write" 
} else { 
  region_write_gate 
} 
 
# Decisión compuesta (objeto) 
decision := { 
  "allow": allow, 
  "reason": reason, 
  "obligations": obligations 
} 
 
