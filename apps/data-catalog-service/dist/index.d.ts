/**
 * GNEW · N320 — Catálogo y descubrimiento de datos
 * Rol: Data Platform
 * Objetivo: Catálogo con búsqueda semántica y owners.
 * Stack: DataHub (GraphQL), embeddings (re-rank), ABAC, SSO (OIDC/JWT), logs de consulta.
 * Entregables: Portal API con linaje y etiquetas; flujos de alta/baja; indexación básica.
 * Despliegue: Integrado a SSO (JWT). Pruebas con cobertura en tablas críticas ≥90%.
 */
declare const server: import("http").Server<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
export default server;
