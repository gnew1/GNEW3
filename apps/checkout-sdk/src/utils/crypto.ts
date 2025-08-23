
import crypto from "crypto";

export async function signIntent(intent: any, apiKey: string) {
  const payload = JSON.stringify(intent);
  const signature = crypto.createHmac("sha256", apiKey).update(payload).digest("hex");
  return { intent, signature };
}

export function verifyWebhook(sig: string, payload: any, pubKey: string) {
  const expected = crypto.createHmac("sha256", pubKey).update(JSON.stringify(payload)).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}


