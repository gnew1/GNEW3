import { Router } from "express"; 
const r = Router(); 
 
// Demo: reemplazar por Subgraph/Tally fetch 
const data = [ 
  { 
    id: "1", 
    title: "Actualizar delay del Timelock a 3 días", 
    description: "Alinea ventanas de objeción y control operativo.", 
    status: "Executed", 
    forVotes: "12.3M", 
    againstVotes: "1.1M", 
    abstainVotes: "0.4M" 
  } 
]; 
 
r.get("/proposals", (_req, res) => res.json(data)); 
export default r; 
 
Ruta completa: ./services/governance/src/server.ts (añadir al final, justo antes del 
listen) 
// ... 
import proposalsMock from "./proposals.mock.js"; 
app.use("/", proposalsMock); 
// ... 
 
 
DoD & Controles automatizados 
