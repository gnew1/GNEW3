/**
 * Observabilidad de contratos GNEW
 * - Exporta métricas Prometheus en /metrics
 * - Recolecta eventos por contrato (logs) y TXs (status) para failure-rate
 * - Webhook opcional /webhooks/failure para integrar Tenderly/Blockscout y sumar fallos
 */
import "dotenv/config";
