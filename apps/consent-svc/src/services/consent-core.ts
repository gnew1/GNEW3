import crypto from "crypto"; 
import { prisma } from "../infra/prisma"; 
export function canonicalJson(input: unknown): string { 
return JSON.stringify(input, Object.keys(input as object).sort()); 
} 
export function hashEvent(payload: unknown): string { 
const canon = canonicalJson(payload); 
return crypto.createHash("sha256").update(canon).digest("hex"); 
} 
export async function normalizeDecisionInput(subjectId: string, 
decisions: any[]) { 
// verificar claves, cargar prevHash por sujeto (último evento) si 
queremos encadenar por sujeto 
const last = await prisma.consentEvent.findFirst({ where: { 
subjectId }, orderBy: { createdAt: "desc" }}); 
const prevHash = last?.eventHash ?? null; 
return decisions.map(d => ({ ...d, prevHash })); 
} 
export async function publishConsentEvent(events: Array<{ type: 
string; hash: string }>) { 
// stub de publicación (Kafka/NATS) 
// ej.: await bus.publish("consent.events", events); 
} 
 
