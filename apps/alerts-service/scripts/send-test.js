import fetch from "node-fetch";

const BASE = process.env.BASE || "http://localhost:8787";

const ev = {
  type: "PROPOSAL_CREATED",
  id: "1234567890",
  proposer: "0xProposer",
  description: "Ejemplo de propuesta",
  block: 1,
  tx: "0xabc"
};

const r = await fetch(`${BASE}/dev/emit`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(ev)
});

console.log("sent", await r.text()); 
