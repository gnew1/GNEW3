# Addressbook (versionado) 
 
Formato: 
```jsonc 
{ 
  "project": "gnew-core", 
  "version": "0.1.x", 
  "deployments": [ 
    { 
      "name": "GnewToken", 
      "address": "0x...", 
      "txHash": "0x...", 
      "chainId": 17000, 
      "network": "holesky", 
      "block": 123456, 
      "impl": null, 
      "timestamp": "2025-08-19T00:00:00Z", 
      "artifact": "src/GnewToken.sol/GnewToken.json", 
      "constructorArgs": ["GNEW","GNEW","0xAdmin","1000000..."] 
    } 
  ] 
} 
 
Se actualiza automáticamente por los scripts de deploy y guarda histórico (nunca sobrescribas 
entradas). Úsalo como fuente de la SDK y para rollback (UUPS). 
 
 
/packages/contracts/scripts/lib/addressbook.ts 
```ts 
import fs from "node:fs"; 
import path from "node:path"; 
 
const BOOK = path.join(__dirname, "..", "addressbook", 
"addressbook.json"); 
 
export type Deployment = { 
name: string; 
address: string; 
txHash: string; 
chainId: number; 
network: string; 
block: number; 
impl: string | null; // para UUPS (implementation) 
timestamp: string; 
artifact: string; 
constructorArgs: unknown[]; 
}; 
export function appendDeployment(d: Deployment) { 
const raw = fs.readFileSync(BOOK, "utf8"); 
const json = JSON.parse(raw); 
json.deployments.push(d); 
fs.writeFileSync(BOOK, JSON.stringify(json, null, 2)); 
return d; 
} 
export function findLast(name: string, chainId: number): Deployment | 
undefined { 
const raw = fs.readFileSync(BOOK, "utf8"); 
const json = JSON.parse(raw) as { deployments: Deployment[] }; 
const list = json.deployments.filter((x) => x.name === name && 
x.chainId === chainId); 
return list.at(-1); 
} 

---
Más decisiones en [docs/adr](../../../docs/adr/) y guía en [docs/contributing.md](../../../docs/contributing.md).
