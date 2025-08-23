import { anchorRecent } from "./anchor-batches"; 
import { refreshAll } from "../services/watchlists"; 
async function loop() { 
try { 
await anchorRecent(); 
} catch {} 
setTimeout(loop, 60_000); 
} 
loop(); 
// refresco periódico de listas 
setInterval(()=>refreshAll().catch(()=>{}), 
(process.env.REFRESH_MINUTES ? Number(process.env.REFRESH_MINUTES) : 
240) * 60_000); 
Enforcement SDK (bloqueo en servicios) 
