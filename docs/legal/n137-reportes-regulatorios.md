# N137 — Reportes regulatorios 
**Flujo**: Definición (Legal/Data en YAML) → Extracción (SQL al DWH) → 
Render (CSV/JSON/XML/XBRL) → Seguridad (PGP/firma) → Entrega (HTTPS 
mTLS/SFTP) → **Acuse** (ID + hora) → Evidencias (hashes, manifest) → 
**Anclaje** (Merkle/ConsentAnchor). 
**DoD** - **Acuses/recepción** persistidos: `ReportRun.ackId/ackAt` + 
artefacto `ack`. - **Reintentos** con backoff (máx. 5) y estados 
`scheduled→generating→delivering→sent→acknowledged/failed`. - **Cobertura inicial**: SAR (FIU), VAT OSS (EU), thresholds AML. 
Nuevos informes = PR al YAML + tests. - **Trazabilidad**: `ReportEvidence` (row_count, ack_hash, anchor_tx), 
artefactos con SHA‑256 y ruta. 
