
import crypto from "node:crypto";
import { MockProvider } from "../src/providers/mock.js";

test("webhook signature ok", async () => {
  const mp = new MockProvider();
  const secret = "mock-secret";
  const ts = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({ ref: "mock_123", status: "completed" });
  const mac = crypto.createHmac("sha256", secret).update(ts + "." + body).digest("hex");
  const ok = await mp.verifyWebhook({ "x-mock-signature": "v1=" + mac, "x-mock-timestamp": ts } as any, body);
  expect(ok).toBe(true);
});


