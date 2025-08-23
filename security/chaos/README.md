# GNEW N63 — Simulaciones de ataque en testnets (Chaos-Security)

**Objetivo:** practicar y automatizar ataques controlados para **SC** y **backend** con _forking mainnet_ y **fuzzing transaccional**, generando **playbooks** y **correcciones**.  
**Roles:** Seguridad (Red Team), QA.  
**DoD:** MTTR reducido (medido por workflow), brechas cerradas (issues creados y enlazados).

## Quickstart (Smart Contracts)
```bash
cd security/chaos
cp .env.example .env   # define FORK_URL, CHAIN_ID, RPC label
make forge-deps        # instala OpenZeppelin
make fork-test         # ejecuta ataques sobre fork
make fuzz              # invariantes y fuzzing transaccional

Quickstart (Backend Chaos)
# Requiere servicio gateway/upstream corriendo en localhost o base URL target
cd security/chaos
BASE_URL=http://localhost:8000 make k6-smoke
BASE_URL=http://localhost:8000 make k6-chaos

Reports
●	Artefactos GitHub: chaos-reports/*

●	Números clave: éxito de ataque, tiempo detección, tiempo cierre (MTTR)

●	Workflow programa ensayos periódicos (cron) y genera issues automáticos si falla una defensa.

Playbooks
Ver playbooks/:
●	reentrancy.md

●	price_oracle.md

●	griefing.md

●	defense.md


/security/chaos/.env.example
```env
# RPC para forking: Alchemy/Infura/Ankr, etc.
FORK_URL=https://eth-mainnet.example/v2/KEY
CHAIN_ID=1
# Opcional: objetivo ya desplegado (si se quiere atacar en fork a un contrato real)
TARGET_VAULT_ADDRESS=0x0000000000000000000000000000000000000000
TARGET_ESCROW_ADDRESS=0x0000000000000000000000000000000000000000

