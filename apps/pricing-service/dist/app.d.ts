/**
 * GNEW · N321 — Motor de precios y descuentos dinámicos
 * Rol: Producto + Backend
 * Objetivo: Precios y promociones por segmento/riesgo.
 * Stack: Motor de reglas custom, caché LRU, APIs REST, auditoría de cambios, canary por segmento.
 * DoD: Consistencia y latencia < 50 ms (cubierta en tests).
 */
export type User = {
    sub: string;
    email?: string;
    roles?: string[];
    segment?: string;
};
declare const app: import("express").Express;
export default app;
