
# @gnew/escrow-disputes (N325)

- `Escrow.sol`: contrato con estados `Pending/Funded/Released/Refunded/Disputed/Resolved`, SLAs `respondBy/arbitrateBy`, evidencias (URI+hash), acuerdo **EIP-712** y arbitraje.
- Eventos: trazabilidad para reportes. Fee (% bps) de la parte del vendedor.
- DoD: tests de liberación, disputa+acuerdo firmado, timeouts.

## Scripts
- `pnpm --filter @gnew/escrow-disputes run build && hardhat test`


Notas mínimas:

Para ERC20, el comprador debe approve al contrato antes de fundToken.

Para nativo, usar fundNative(id) con msg.value == amount.

SLAs: autoReleaseIfTimeout() y refundIfNoArbitration() son “watchers” que cualquiera puede invocar (cron off-chain).

Seguridad: sin PII on-chain; evidencias por hash/uri. EIP-712 valida firmas de comprador y vendedor.

Siguiente a ejecutar en la próxima interacción: N326 (Conciliación multi-proveedor).

