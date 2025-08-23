# Playbook: Reentrancy

**Vector:** push-payments, interacción antes de efectos (violación CEI).  
**Ataque:** `ReentrancyAttacker` llama `withdraw()` y reingresa por `receive()` hasta agotar saldo.  
**Cómo ejecutar:**
```bash
make fork-test -- -vv --match-test test_reentrancy_drains_vulnerable

Detección: caída brusca del balance del cofre, múltiples eventos de retiro en un solo tx.
 Defensa: patrón Pull (withdraw() por el usuario), CEI, nonReentrant, usar SafeERC20.
 Corrección: migrar pagos push→pull; añadir pausa en incidentes.

/security/chaos/playbooks/price_oracle.md
```md
# Playbook: Manipulación de Oráculo / Precio

**Vector:** oráculo sin TWAP/caps/señales de frescura (staleness).  
**Ataque:** keeper comprometido publica precio extremo; `OracleVictimAmm` acuña tokens en exceso.  
**Cómo ejecutar:**
```bash
make fork-test -- -vv --match-test test_price_oracle_manipulation_mints_excess_tokens

Detección: delta de precio > X% en ventana corta; mint/outliers en métricas.
 Defensa: TWAP (AMM), Chainlink con deviation threshold, staleness checks, pausas por desviación, circuit breakers.
 Corrección: introducir límites de cambio por bloque/epoch, maxPriceDeviation, y validaciones de oráculo múltiple.

/security/chaos/playbooks/griefing.md
```md
# Playbook: Griefing / DoS por receiver que revierte

**Vector:** pagos push a direcciones con `receive()` que revierte → imposibilidad de procesar pago.  
**Ataque:** `GriefingReceiver` fuerza revert al recibir ETH.  
**Cómo ejecutar:**
```bash
make fork-test -- -vv --match-test test_push_payment_fails_on_griefing

Defensa: patrón Pull (beneficiario retira), colas de pagos, expiración de créditos.
 Corrección: migración a PullPaymentEscrow y validaciones de retry-withdraw.

/security/chaos/playbooks/defense.md
```md
# Playbook de Defensa y Correcciones

- **Reentrancia:** CEI + `nonReentrant` + pagos pull; añade `pause()` para incidentes.
- **Oráculos:** TWAP, múltiples fuentes, staleness y desvío máximo; _kill-switch_.
- **Griefing:** pagos pull, manejo de fallas idempotente, límites por tx y por bloque.
- **Proceso:** crear issue con título `SEC: <vector> [<date>]`, reproducibilidad y parche propuesto.

