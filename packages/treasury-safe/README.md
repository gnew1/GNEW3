# Safe Configuration (Multisig) - 3 Safes por fondo: operativo, grants, rnd. - Owners y umbrales establecidos según riesgo. - Guardian de emergencia con capacidad de `pause()` en el Guard 
on-chain. 
**Creación (ejemplo con Safe CLI):** 
```bash 
safe-cli deploy --owners 0xCFO...,0xFINOPS1...,0xFINOPS2...,0xEXEC1... --threshold 2 --salt-nonce 101 
Rotación de owner: 
safe-cli owners add --safe 0xOPERATIVO_SAFE --owner 0xNEWOWNER... 
safe-cli owners remove --safe 0xOPERATIVO_SAFE --owner 0xFINOPS2... 
safe-cli threshold set --safe 0xOPERATIVO_SAFE --threshold 2 --- 
### `./packages/contracts-treasury/package.json` 
```json 
{ 
"name": "@repo/contracts-treasury", 
"private": true, 
"version": "1.0.0", 
"scripts": { 
"build": "hardhat compile", 
"test": "hardhat test", 
"deploy:guard": "hardhat run scripts/deploy_guard.ts --network 
network" 
}, 
"devDependencies": { 
"@nomicfoundation/hardhat-toolbox": "^5.0.0", 
"hardhat": "^2.22.16", 
"typescript": "^5.6.3", 
    "ts-node": "^10.9.2", 
    "@types/node": "^22.15.3" 
  } 
} 
 
 

---
Más decisiones en [docs/adr](../../docs/adr/) y guía en [docs/contributing.md](../../docs/contributing.md).
