import crypto from "crypto"; 
export async function signCertificate(payload: unknown) { 
const privPem = process.env.DSAR_CERT_ED25519_PRIV!; 
const sign = crypto.sign(null, Buffer.from(JSON.stringify(payload)), 
crypto.createPrivateKey(privPem)); 
const pub = crypto.createPublicKey(privPem).export({ type: "spki", 
format: "pem" }).toString(); 
return { signature: sign.toString("base64"), publicKey: pub }; 
} 
Anclaje (reuso de ConsentAnchor de N130) 
