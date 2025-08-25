/**
 * GNEW · N323 — Ledger doble-entrada auditable
 * Rol: FinTech Eng
 * Objetivo: Subledger on-chain/off-chain con export XBRL.
 * Stack: Postgres + eventos; snapshot on-chain (txid/chain); Node/TS + Express.
 * Entregables: Tablas, vistas, exportadores (XBRL); conciliación automática; bloqueo de período.
 * Pruebas/DoD: Descuadre = 0; trazabilidad por txid; period lock.
 * Seguridad & Observabilidad: Rastreabilidad por txid; logs estructurados; SSO opcional (JWT).
 * Despliegue: Migración guiada (SQL en /src/db/migrations).
 */
import { type Application } from "express";
type User = {
    sub: string;
    roles?: string[];
    email?: string;
};
declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}
declare const app: Application;
export default app;
