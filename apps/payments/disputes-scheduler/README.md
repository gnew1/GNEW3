
# Disputes Scheduler

Job que revisa **deadlines** y aplica:
- **Auto‑close** por expiración: si `respondBy` < ahora:
  - Estados `chargeback|prearbitration|arbitration` → `lost` (+ **clawback**)
  - Estado `representment` → `lost` si no hubo avance
- **Notificaciones** de recordatorio (`T-48h`, `T-24h`, `T-1h`).

Variables:
- `API_BASE` (default `http://localhost:8085`)
- (Opcional) `WEBHOOK_URL` en el servicio para notificar.


