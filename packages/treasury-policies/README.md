# GNEW Treasury Policies (OPA) - Las políticas están escritas en Rego y se evalúan mediante un 
sidecar OPA. - Entrada esperada: ver `input.schema.json`. - Decisión principal: `data.gnew.treasury.allow` → `{ allow: bool, 
reasons: [...], requiredSigners, maxAmountWei }`. 
Pruebas: 
```bash 
opa test . -v --- 
### `./packages/treasury-policies/input.schema.json` 
```json 
{ 
  "type": "object", 
  "required": ["initiator", "tx", "context"], 
  "properties": { 
    "initiator": { 
      "type": "object", 
      "required": ["address"], 
      "properties": { 
        "address": { "type": "string" }, 
        "role": { "enum": ["CFO", "FINANCE_OPS", "GRANTS_LEAD", 
"RND_LEAD", "EXEC", "VIEWER"] } 
      } 
    }, 
    "tx": { 
      "type": "object", 
      "required": ["safe", "to", "valueWei"], 
      "properties": { 
        "safe": { "type": "string" }, 
        "to": { "type": "string" }, 
        "valueWei": { "type": "string" }, 
        "token": { "type": ["string", "null"] }, 
        "data": { "type": "string" }, 
        "operation": { "type": "integer" } 
      } 
    }, 
    "context": { 
      "type": "object", 
      "required": ["chainId", "fundKind", "utcHour", "weekday", 
"threshold", "currentApprovals"], 
      "properties": { 
        "chainId": { "type": "integer" }, 
        "fundKind": { "enum": ["operativo", "grants", "rnd"] }, 
        "utcHour": { "type": "integer" }, 
        "weekday": { "type": "integer" }, 
        "threshold": { "type": "integer" }, 
        "currentApprovals": { "type": "integer" } 
      } 
    } 
  } 
} 

---
Más decisiones en [docs/adr](../../docs/adr/) y guía en [docs/contributing.md](../../docs/contributing.md).
