/** 
* gas-diff.ts 
* Compara dos snapshots (.gas-snapshot) y evalúa mejora en funciones 
"hot". 
* Uso: 
*  ts-node scripts/ci/gas-diff.ts base.txt head.txt 
"StakingManagerGasTest: gas_delegate_hot,StakingManagerGasTest: 
gas_undelegate_hot,StakingManagerGasTest: 
gas_claim_hot,StakingManagerGasTest: gas_executeSlash_hot" 
*  Retorna código 1 si la mejora media < TARGET% (por defecto 15). 
*/ 
import fs from "node:fs"; 
const [,, basePath, headPath, targetsArg] = process.argv; 
if (!basePath || !headPath) { 
console.error("Uso: gas-diff <base> <head> <comma-separated 
targets>"); 
process.exit(2); 
} 
const targets = (targetsArg || "").split(",").map(s => 
s.trim()).filter(Boolean); 
const TARGET = Number(process.env.GAS_TARGET || "15"); // % 
const base = fs.readFileSync(basePath, "utf8").split("\n"); 
const head = fs.readFileSync(headPath, "utf8").split("\n"); 
 
function parse(lines: string[]) { 
  // Formato Forge: "<TestContract>: <testName>() (gas: <num>)" 
  const map = new Map<string, number>(); 
  const re = /^([^:]+):\s+([^\(]+)\(\)\s+\(gas:\s+(\d+)\)/; 
  for (const ln of lines) { 
    const m = re.exec(ln.trim()); 
    if (!m) continue; 
    const key = `${m[1].trim()}: ${m[2].trim()}`; 
    map.set(key, Number(m[3])); 
  } 
  return map; 
} 
 
const baseMap = parse(base); 
const headMap = parse(head); 
 
const rows: 
Array<{key:string;base:number;head:number;delta:number;improv:number}> 
= []; 
const keys = targets.length ? targets : Array.from(new 
Set([...baseMap.keys(), ...headMap.keys()])); 
for (const k of keys) { 
  const b = baseMap.get(k); 
  const h = headMap.get(k); 
  if (b && h) { 
    const delta = h - b; // negativo = mejora 
    const improv = ((b - h) / b) * 100; 
    rows.push({ key:k, base:b, head:h, delta, improv }); 
  } 
} 
 
rows.sort((a,b)=>a.key.localeCompare(b.key)); 
 
let avg = 0; 
if (rows.length) avg = rows.reduce((s,r)=>s+r.improv,0)/rows.length; 
 
const header = `| Test | Base Gas | Head Gas | Δ | Mejora 
|\n|---|---:|---:|---:|---:|`; 
const lines = rows.map(r => `| \`${r.key}\` | ${r.base} | ${r.head} | 
${r.delta} | ${r.improv.toFixed(2)}% |`); 
const table = [header, ...lines].join("\n"); 
 
console.log(table); 
console.log(`\nMejora media: ${avg.toFixed(2)}% (target ${TARGET}%)`); 
 
if (avg + 1e-9 < TARGET) { 
  console.error(`FAIL: mejora < ${TARGET}%`); 
  process.exit(1); 
} 
 
