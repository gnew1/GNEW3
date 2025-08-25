/**
 * Pruebas básicas (Jest + Supertest)
 * DoD: Cobertura ≥ 90% para rutas críticas /search y /datasets/:urn
 */
import request from "supertest";
import server from "../src/index";
import jwt from "jsonwebtoken";
const PRIV = `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQC6Q3XcC...
-----END RSA PRIVATE KEY-----`;
function sign(payload) {
    return jwt.sign(payload, PRIV, {
        algorithm: "RS256",
        audience: process.env.JWT_AUDIENCE ?? "gnew",
        issuer: process.env.JWT_ISSUER ?? "https://sso.example.com/",
        expiresIn: "10m",
    });
}
// Mock fetch to DataHub
jest.mock("node-fetch", () => {
    const fetch = jest.fn(async (_url, _opts) => {
        const body = JSON.parse(_opts.body ?? "{}");
        const q = body.query;
        // mock search
        if (q.includes("search(input")) {
            return {
                ok: true,
                json: async () => ({
                    data: {
                        search: {
                            start: 0,
                            count: 2,
                            total: 2,
                            searchResults: [
                                {
                                    entity: {
                                        urn: "urn:li:dataset:(urn:li:dataPlatform:hive,db.tbl1,PROD)",
                                        name: "db.tbl1",
                                        platform: { name: "hive" },
                                        ownership: { owners: [{ owner: { urn: "urn:li:corpuser:alice" } }] },
                                        globalTags: { tags: [{ tag: { name: "internal" } }] },
                                        editableProperties: { description: "Customer orders table" },
                                        domain: { domain: { name: "sales" } },
                                    },
                                },
                                {
                                    entity: {
                                        urn: "urn:li:dataset:(urn:li:dataPlatform:hive,db.tbl2,PROD)",
                                        name: "db.tbl2",
                                        platform: { name: "hive" },
                                        ownership: { owners: [{ owner: { urn: "urn:li:corpuser:bob" } }] },
                                        globalTags: { tags: [{ tag: { name: "restricted" } }, { tag: { name: "pii" } }] },
                                        editableProperties: { description: "PII customers" },
                                        domain: { domain: { name: "sales" } },
                                    },
                                },
                            ],
                        },
                    },
                }),
            };
        }
        // mock getDataset
        if (q.includes("query GetDataset")) {
            const urn = body.variables.urn;
            const isTbl1 = urn.includes("tbl1");
            return {
                ok: true,
                json: async () => ({
                    data: {
                        dataset: isTbl1
                            ? {
                                urn,
                                name: "db.tbl1",
                                platform: { name: "hive" },
                                ownership: { owners: [{ owner: { urn: "urn:li:corpuser:alice" } }] },
                                globalTags: { tags: [{ tag: { name: "internal" } }] },
                                editableProperties: { description: "Customer orders table" },
                                domain: { domain: { name: "sales" } },
                            }
                            : {
                                urn,
                                name: "db.tbl2",
                                platform: { name: "hive" },
                                ownership: { owners: [{ owner: { urn: "urn:li:corpuser:bob" } }] },
                                globalTags: { tags: [{ tag: { name: "restricted" } }, { tag: { name: "pii" } }] },
                                editableProperties: { description: "PII customers" },
                                domain: { domain: { name: "sales" } },
                            },
                    },
                }),
            };
        }
        // mock lineage
        if (q.includes("query Lineage")) {
            return {
                ok: true,
                json: async () => ({
                    data: {
                        dataset: {
                            upstreamLineage: { entities: [{ urn: "urn:up1" }] },
                            downstreamLineage: { entities: [{ urn: "urn:down1" }] },
                        },
                    },
                }),
            };
        }
        // upsert / delete
        if (q.includes("ingestProposalBatch") || q.includes("deleteEntity")) {
            return { ok: true, json: async () => ({ data: { ok: true } }) };
        }
        return { ok: false, status: 400, json: async () => ({}) };
    });
    return { __esModule: true, default: fetch };
});
describe("data-catalog-service", () => {
    const admin = sign({ sub: "admin", roles: ["catalog:admin"], dept: "sales", clearance: 3, email: "admin@gnew.io" });
    const userSales = sign({ sub: "u1", roles: ["user"], dept: "sales", clearance: 1, email: "u1@gnew.io" });
    const userOther = sign({ sub: "u2", roles: ["user"], dept: "risk", clearance: 1, email: "u2@gnew.io" });
    it("health", async () => {
        const res = await request(server).get("/healthz");
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
    it("search applies ABAC and returns internal but filters restricted for low clearance", async () => {
        const res = await request(server).get("/search?q=customers").set("Authorization", `Bearer ${userSales}`);
        expect(res.status).toBe(200);
        const urns = res.body.results.map((r) => r.urn);
        expect(urns).toContain("urn:li:dataset:(urn:li:dataPlatform:hive,db.tbl1,PROD)");
        expect(urns).not.toContain("urn:li:dataset:(urn:li:dataPlatform:hive,db.tbl2,PROD)");
    });
    it("search denies when dept mismatch for internal", async () => {
        const res = await request(server).get("/search?q=orders").set("Authorization", `Bearer ${userOther}`);
        expect(res.status).toBe(200);
        // internal 'sales' datasets no deberían mostrarse a 'risk'
        expect(res.body.results.length).toBe(0);
    });
    it("get dataset + lineage ok when allowed", async () => {
        const urn = encodeURIComponent("urn:li:dataset:(urn:li:dataPlatform:hive,db.tbl1,PROD)");
        const res = await request(server).get(`/datasets/${urn}`).set("Authorization", `Bearer ${userSales}`);
        expect(res.status).toBe(200);
        expect(res.body.dataset.name).toBe("db.tbl1");
        expect(res.body.lineage.upstream).toEqual(["urn:up1"]);
    });
    it("get dataset forbidden when restricted and low clearance", async () => {
        const urn = encodeURIComponent("urn:li:dataset:(urn:li:dataPlatform:hive,db.tbl2,PROD)");
        const res = await request(server).get(`/datasets/${urn}`).set("Authorization", `Bearer ${userSales}`);
        expect(res.status).toBe(403);
    });
    it("admin can upsert (alta)", async () => {
        const res = await request(server)
            .post("/datasets")
            .set("Authorization", `Bearer ${admin}`)
            .send({
            urn: "urn:li:dataset:(urn:li:dataPlatform:hive,db.tbl3,PROD)",
            name: "db.tbl3",
            platform: "hive",
            description: "New table",
            owners: ["urn:li:corpuser:admin"],
            tags: ["internal"],
            domain: "sales",
        });
        expect(res.status).toBe(201);
    });
    it("non-admin cannot upsert", async () => {
        const res = await request(server)
            .post("/datasets")
            .set("Authorization", `Bearer ${userSales}`)
            .send({
            urn: "urn:li:dataset:(urn:li:dataPlatform:hive,db.tblX,PROD)",
            name: "db.tblX",
            platform: "hive",
        });
        expect(res.status).toBe(403);
    });
    it("admin can delete (baja)", async () => {
        const urn = encodeURIComponent("urn:li:dataset:(urn:li:dataPlatform:hive,db.tbl3,PROD)");
        const res = await request(server).delete(`/datasets/${urn}`).set("Authorization", `Bearer ${admin}`);
        expect(res.status).toBe(200);
    });
});
