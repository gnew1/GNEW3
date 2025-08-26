import request from "supertest";
import app from "../src/app";
describe("subscription-billing-service", () => {
    it("healthz", async () => {
        const r = await request(app).get("/healthz");
        expect(r.status).toBe(200);
        expect(r.body.ok).toBe(true);
    });
    it("metrics endpoint", async () => {
        const r = await request(app).get("/metrics");
        expect(r.status).toBe(200);
        expect(r.body).toHaveProperty("attempts");
    });
});
