import { enforceDueTags } from "../services/enforcer"; 
async function loop() { 
try { 
await enforceDueTags(500); 
} catch (e) { /* log con OTel */ } 
setTimeout(loop, 10_000); // 10s; en prod usar cron/queue 
} 
loop(); 
Conectores de retención 
