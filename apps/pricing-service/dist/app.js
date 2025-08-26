/**
 * GNEW · N321 — Motor de precios y descuentos dinámicos
 * Rol: Producto + Backend
 * Objetivo: Precios y promociones por segmento/riesgo.
 * Stack: Motor de reglas custom, caché LRU, APIs REST, auditoría de cambios, canary por segmento.
 * DoD: Consistencia y latencia < 50 ms (cubierta en tests).
 */
import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import jwt from "jsonwebtoken";
import { PriceEngine } from "./engine/engine";
import { RulesStore } from "./store/rules";
import { AuditStore } from "./store/audit";
import path from "path";
const PORT = Number(process.env.PORT ?? 8091);
const JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "gnew";
const JWT_ISSUER = process.env.JWT_ISSUER ?? "https://sso.example.com/";
const JWT_PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY ?? "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----").replace(/\\n/g, "\n");
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const httpLogger = pinoHttp({ logger });
function authOptional(req, _res, next) {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
        try {
            const decoded = jwt.verify(auth.slice(7), JWT_PUBLIC_KEY, {
                algorithms: ["RS256"],
                audience: JWT_AUDIENCE,
                issuer: JWT_ISSUER,
            });
            req.user = {
                sub: String(decoded.sub),
                email: typeof decoded.email === "string" ? decoded.email : undefined,
                roles: Array.isArray(decoded.roles) ? decoded.roles : [],
                segment: typeof decoded.segment === "string" ? decoded.segment : undefined,
            };
        }
        catch {
            // ignora, endpoints públicos seguirán funcionando sin user
        }
    }
    next();
}
function requireAdmin(req, res, next) {
    const user = req.user;
    if (!user?.roles?.includes("pricing:admin"))
        return res.status(403).json({ error: "forbidden" });
    next();
}
// --- App wiring ---
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(httpLogger);
app.use(authOptional);
// Stores
const audit = new AuditStore(process.env.AUDIT_FILE ?? "");
const rules = new RulesStore(audit);
const engine = new PriceEngine(rules);
// Static panel
app.use("/panel", express.static(path.join(__dirname, "..", "public")));
// Health
app.get("/healthz", (_req, res) => res.json({ ok: true }));
// Quote API
app.post("/price/quote", async (req, res) => {
    const t0 = process.hrtime.bigint();
    try {
        const { sku, basePrice, currency, user, context, } = req.body;
        if (!sku || typeof basePrice !== "number" || !currency || !user?.id) {
            return res.status(400).json({ error: "invalid_input" });
        }
        const applied = await engine.quote({
            sku,
            basePrice,
            currency,
            userId: user.id,
            segment: user.segment,
            riskScore: user.riskScore ?? 0,
            quantity: context?.quantity ?? 1,
        });
        const t1 = process.hrtime.bigint();
        const ms = Number(t1 - t0) / 1e6;
        res.json({ ...applied, latencyMs: ms });
    }
    catch (e) {
        logger.error(e, "quote_error");
        res.status(500).json({ error: "quote_error" });
    }
});
// ---- Admin APIs (require pricing:admin) ----
// List rulesets (all)
app.get("/admin/rulesets", requireAdmin, (_req, res) => {
    res.json(rules.list());
});
// Create draft ruleset
app.post("/admin/rulesets", requireAdmin, (req, res) => {
    const body = req.body;
    const user = req.user;
    const r = rules.createDraft(body.name, body.rules ?? [], user.sub, body.notes);
    res.status(201).json(r);
});
// Update draft
app.put("/admin/rulesets/:id", requireAdmin, (req, res) => {
    const id = req.params.id;
    const user = req.user;
    const updated = rules.updateDraft(id, req.body, user.sub);
    res.json(updated);
});
// Validate collisions
app.post("/admin/rulesets/:id/validate", requireAdmin, (req, res) => {
    const id = req.params.id;
    const result = rules.validateCollisions(id);
    res.json(result);
});
// Publish ruleset (new production version)
app.post("/admin/rulesets/:id/publish", requireAdmin, (req, res) => {
    const id = req.params.id;
    const user = req.user;
    const label = typeof req.body?.label === "string" ? req.body.label : undefined;
    const published = rules.publish(id, user.sub, label);
    res.json(published);
});
// Configure canary per segment
app.post("/admin/canary", requireAdmin, (req, res) => {
    const body = req.body;
    const user = req.user;
    const before = rules.getCanary();
    rules.setCanary(body, user.sub);
    res.json({ ok: true, before, after: rules.getCanary() });
});
// Audit log tail
app.get("/admin/audit", requireAdmin, (_req, res) => {
    res.json(audit.tail(200));
});
// Start server if main
if (require.main === module) {
    app.listen(PORT, () => logger.info({ msg: `pricing-service listening on :${PORT}` }));
}
export default app;
