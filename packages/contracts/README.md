# @gnew/contracts 
 
## DoD / Estándares - SPDX headers + NatSpec - Solidity ^0.8.24 - OpenZeppelin ^5.x - Cobertura objetivo ≥ 90% - CI verde 
 
## Comandos 
```bash 
# Local 
anvil -p 8545 
pnpm contracts:compile 
pnpm test:contracts:hh 
pnpm test:contracts:forge 
 
# Despliegues 
pnpm --filter @gnew/contracts deploy           # anvil 
pnpm --filter @gnew/contracts deploy:holesky   # Holesky 
pnpm --filter @gnew/contracts deploy:amoy      # Polygon Amoy 
 
Redes 
● local (Anvil) 
 
● Goerli (legacy, solo si se requiere) 
 
● Holesky (ETH testnet canónica) 
 
● Polygon Amoy (testnet) 
 
Riesgos & Controles 
● Fugas de claves: .env local + secret manager/vault en CI. 
 
● Deriva de estilo: ESLint/Prettier + commitlint/husky. 
 
 
/packages/sdk/package.json 
```json 
{ 
  "name": "@gnew/sdk", 
  "version": "0.1.0", 
  "type": "module", 
  "private": true, 
  "main": "dist/index.js", 
  "types": "dist/index.d.ts", 
  "exports": { 
    ".": { 
      "import": "./dist/index.js", 
      "types": "./dist/index.d.ts" 
    } 
  }, 
  "files": ["dist", "README.md"], 
  "scripts": { 
    "build": "tsc -p tsconfig.json", 
    "clean": "rimraf dist" 
  }, 
  "dependencies": { 
    "ethers": "^6.13.0" 
  }, 
"devDependencies": { 
"rimraf": "^6.0.1", 
"typescript": "^5.5.4" 
} 
} 

---
Más decisiones en [docs/adr](../../docs/adr/) y guía en [docs/contributing.md](../../docs/contributing.md).
