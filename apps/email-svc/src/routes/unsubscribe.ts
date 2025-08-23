// Enlace de baja por canal (email → marketing:denied) 
import { Router } from "express"; 
import crypto from "crypto"; 
export const router = Router(); 
 
function verifyToken(token: string) { 
  const [payloadB64, sigB64] = token.split("."); 
  const sig = Buffer.from(sigB64, "base64"); 
  const h = crypto.createHmac("sha256", 
process.env.UNSUB_HMAC_SECRET!).update(payloadB64).digest(); 
  if (!crypto.timingSafeEqual(sig, h)) throw new Error("BAD_SIG"); 
  return JSON.parse(Buffer.from(payloadB64, "base64").toString()); 
} 
 
router.get("/u/:token", async (req, res) => { 
  try { 
    const { subjectId } = verifyToken(req.params.token); 
    await 
fetch(`${process.env.CONSENT_API}/v1/consent/${subjectId}/decisions`, 
{ 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ 
        decisions: [{ 
          purposeKey: "growth_marketing", dataCategoryKey: "email", 
processingUseKey: "marketing", channelKey: "email", 
          state: "denied", policyVersion: "v1", provenance: "ui_flow" 
        }] 
      }) 
    }); 
    res.send("Has sido dado de baja de emails de marketing."); 
  } catch { 
    res.status(400).send("Token inválido o expirado."); 
  } 
}); 
 
