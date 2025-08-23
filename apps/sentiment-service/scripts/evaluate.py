```python 
# Simple evaluator (macro-F1) para dataset propio (CSV con columnas: 
text,label) 
import argparse, csv, sys, json 
from collections import Counter 
from sklearn.metrics import f1_score, classification_report  # pip 
install scikit-learn 
from pathlib import Path 
sys.path.append(str(Path(__file__).resolve().parents[1] / "src")) 
from index import score_text  # reuse loaded model if desired 
def main(): 
ap = argparse.ArgumentParser() 
ap.add_argument("--dataset", required=True, help="CSV con 
columnas: text,label") 
args = ap.parse_args() 
    y_true, y_pred = [], [] 
    with open(args.dataset, newline="", encoding="utf-8") as f: 
        r = csv.DictReader(f) 
        for row in r: 
            t = row["text"] 
            y = row["label"].strip().lower() 
            y_true.append(y) 
            y_pred.append(score_text(t)["label"]) 
 
    labels = ["negative","neutral","positive"] 
    macro = f1_score(y_true, y_pred, labels=labels, average="macro") 
    print(json.dumps({ 
        "macro_f1": macro, 
        "support": Counter(y_true), 
        "report": classification_report(y_true, y_pred, labels=labels, 
digits=4, zero_division=0) 
    }, indent=2)) 
 
if __name__ == "__main__": 
    main() 
 
 
/apps/governance-web/src/hooks/useSentiment.ts 
import { JsonRpcProvider, Contract } from "ethers"; 
import { GOVERNOR_ABI } from "@abi/governor"; 
import { ENV } from "@lib/env"; 
 
type Dist = { negative: number; neutral: number; positive: number; 
expected: number }; 
type Item = { voter: string; reason: string }; 
 
export async function scoreText(text: string): Promise<{ label: 
string; expected: number }> { 
  const res = await 
fetch(`${import.meta.env.VITE_SENTIMENT_BASE}/score`, { 
    method: "POST", 
    headers: { "content-type": "application/json" }, 
    body: JSON.stringify({ text }) 
  }); 
  if (!res.ok) throw new Error("sentiment failed"); 
  const j = await res.json(); 
  return { label: j.label, expected: j.expected }; 
} 
 
export async function fetchReasons(proposalId: string): 
Promise<Item[]> { 
  const prov = new JsonRpcProvider(ENV.RPC_URL); 
  const gov  = new Contract(ENV.GOVERNOR, GOVERNOR_ABI, prov); 
  const evs  = await gov.queryFilter(gov.filters.VoteCast(undefined, 
BigInt(proposalId))); 
  // args: voter, proposalId, support, weight, reason 
  return evs 
    .map((e:any)=>({ voter: e.args?.voter as string, reason: 
(e.args?.reason as string) || "" })) 
    .filter((x)=>x.reason && x.reason.trim().length > 0); 
} 
 
export async function scoreReasons(proposalId: string): Promise<{ 
dist: Dist; badges: { voter: string; label: string }[] }> { 
  const items = await fetchReasons(proposalId); 
  if (items.length === 0) return { dist: { negative: 0, neutral: 1, 
positive: 0, expected: 0 }, badges: [] }; 
 
  const batch = { items: items.map((it, i) => ({ id: String(i), text: 
it.reason })) }; 
  const res = await 
fetch(`${import.meta.env.VITE_SENTIMENT_BASE}/score/batch`, { 
    method: "POST", 
    headers: { "content-type": "application/json" }, 
    body: JSON.stringify(batch) 
  }); 
  const out = await res.json() as Array<{ id: string; label: string; 
expected: number }>; 
 
  let neg = 0, neu = 0, pos = 0, exp = 0; 
  const badges = out.map((o, i) => { 
    if (o.label === "negative") neg += 1; 
    else if (o.label === "neutral") neu += 1; 
    else pos += 1; 
    exp += o.expected; 
    return { voter: items[i].voter, label: o.label }; 
  }); 
 
  const n = out.length || 1; 
  return { dist: { negative: neg/n, neutral: neu/n, positive: pos/n, 
expected: exp/n }, badges }; 
} 
 
/apps/governance-web/src/components/SentimentBadge.tsx 
import React from "react"; 
 
export function SentimentBadge({ label, srLabel }: { label: "positive" 
| "neutral" | "negative"; srLabel?: string }) { 
  const txt = label === "positive" ? "Positivo" : label === "negative" 
? "Negativo" : "Neutral"; 
  const bg  = label === "positive" ? "#DCFCE7" : label === "negative" 
? "#FEE2E2" : "#E5E7EB"; 
  const fg  = label === "positive" ? "#166534" : label === "negative" 
? "#991B1B" : "#374151"; 
  return ( 
    <span 
      role="status" 
      aria-label={srLabel || `Tono ${txt}`} 
      style={{ backgroundColor: bg, color: fg, padding: "2px 8px", 
borderRadius: 999, fontSize: 12, fontWeight: 600 }} 
    > 
      {txt} 
    </span> 
  ); 
} 
 
/apps/governance-web/src/pages/ProposalDetail.tsx (actualizado para badges de tono) 
import React, { useEffect, useState } from "react"; 
import { useParams } from "react-router-dom"; 
import { Contract, JsonRpcProvider, ethers } from "ethers"; 
import { ENV } from "@lib/env"; 
import { GOVERNOR_ABI } from "@abi/governor"; 
import { useSigner } from "@hooks/useSigner"; 
import { scoreReasons } from "@hooks/useSentiment"; 
import { SentimentBadge } from "@components/SentimentBadge"; 
 
export default function ProposalDetail() { 
  const { id } = useParams<{id:string}>(); 
  const [desc, setDesc]   = useState(""); 
  const [state, setState] = useState<number>(0); 
  const [votes, setVotes] = useState<{for: bigint; against: bigint; 
abstain: bigint} | null>(null); 
  const [reason, setReason] = useState(""); 
  const [busy, setBusy] = useState(false); 
  const [err, setErr]   = useState<string | null>(null); 
 
  const [tone, setTone] = 
useState<"positive"|"neutral"|"negative">("neutral"); 
  const [toneHint, setToneHint] = useState<string>("—"); 
 
  useEffect(() => { 
    (async () => { 
      const prov = new JsonRpcProvider(ENV.RPC_URL); 
      const gov = new Contract(ENV.GOVERNOR, GOVERNOR_ABI, prov); 
      const ev = await 
gov.queryFilter(gov.filters.ProposalCreated(BigInt(id!))); 
      setDesc(ev[0]?.args?.description ?? ""); 
 
      try { 
        const st = await gov.state(id); 
        setState(Number(st)); 
        const pv = await gov.proposalVotes(id).catch(()=>null); 
        if (pv) setVotes({ against: pv[0], for: pv[1], abstain: pv[2] 
}); 
      } catch {} 
 
      // === Tono del debate (vía razones de voto) === 
      try { 
        const { dist } = await scoreReasons(id!); 
        // regla sencilla: el signo de expected define badge principal 
        const label = dist.expected > 0.15 ? "positive" : 
dist.expected < -0.15 ? "negative" : "neutral"; 
        setTone(label as any); 
        setToneHint(`Pos ${(dist.positive*100).toFixed(0)}% · Neu 
${(dist.neutral*100).toFixed(0)}% · Neg 
${(dist.negative*100).toFixed(0)}%`); 
      } catch { /* ignora si no hay servicio o razones */ } 
    })(); 
  }, [id]); 
 
  async function cast(s: 0|1|2) { 
    setBusy(true); setErr(null); 
    try { 
      const sb = await useSigner(); 
      const sp = sb.type === "browser" ? await sb.provider.getSigner() 
: sb.type === "dev" ? sb.wallet : sb.provider; 
      const gov = new Contract(ENV.GOVERNOR, GOVERNOR_ABI, sp); 
      const tx = await gov.castVoteWithReason(id, s, reason || ""); 
      await tx.wait(); 
      const st = await gov.state(id); 
      setState(Number(st)); 
    } catch (e:any) { 
      setErr(e.message || String(e)); 
    } finally { setBusy(false); } 
  } 
 
  async function queueOrExecute(which: "queue"|"execute") { 
    setBusy(true); setErr(null); 
    try { 
      const sb = await useSigner(); 
      const sp = sb.type === "browser" ? await sb.provider.getSigner() 
: sb.type === "dev" ? sb.wallet : sb.provider; 
      const gov = new Contract(ENV.GOVERNOR, GOVERNOR_ABI, sp); 
      const evs = await 
gov.queryFilter(gov.filters.ProposalCreated(BigInt(id!))); 
      const e = evs[0]; 
      const targets = e.args?.targets as string[]; 
      const values = e.args?.values as bigint[]; 
      const datas = e.args?.calldatas as string[]; 
      const dh = ethers.id(desc); 
      const tx = which === "queue" ? await gov.queue(targets, values, 
datas, dh) : await gov.execute(targets, values, datas, dh); 
      await tx.wait(); 
      const st = await gov.state(id); 
      setState(Number(st)); 
    } catch (e:any) { setErr(e.message || String(e)); } finally { 
setBusy(false); } 
  } 
 
  if (!id) return null; 
  return ( 
    <main id="main" className="container" role="main"> 
      <article className="card" aria-labelledby="h"> 
        <div className="text-sm" aria-live="polite">Estado: {state} 
(0=Pending,1=Active,3=Defeated,4=Succeeded,5=Queued,7=Executed)</div> 
        <div style={{ display:"flex", alignItems:"center", gap:8, 
justifyContent:"space-between" }}> 
          <h1 id="h">{desc || `Propuesta #${id}`}</h1> 
          <div title={toneHint}><SentimentBadge label={tone} 
srLabel={`Tono del debate: ${tone}`} /></div> 
        </div> 
 
        {votes && ( 
          <p className="text-xs" aria-live="polite">For: 
{votes.for.toString()} | Against: {votes.against.toString()} | 
Abstain: {votes.abstain.toString()}</p> 
        )} 
 
        <label htmlFor="reason" className="text-sm">Razón del voto 
(opcional)</label> 
        <input id="reason" className="card" value={reason} 
onChange={(e)=>setReason(e.target.value)} 
aria-describedby="reason-hint" /> 
        <p id="reason-hint" className="text-xs" 
style={{color:"var(--muted)"}}>Se publica on‑chain para transparencia y 
alimenta el análisis de tono.</p> 
 
        <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}> 
          <button className="btn secondary" onClick={()=>cast(1)} 
disabled={busy}>Votar For</button> 
          <button className="btn secondary" onClick={()=>cast(0)} 
disabled={busy}>Votar Against</button> 
          <button className="btn secondary" onClick={()=>cast(2)} 
disabled={busy}>Votar Abstain</button> 
          <button className="btn" 
onClick={()=>queueOrExecute("queue")} disabled={busy}>Queue</button> 
          <button className="btn" 
onClick={()=>queueOrExecute("execute")} 
disabled={busy}>Execute</button> 
        </div> 
        {err && <p role="alert" style={{color:"#b91c1c"}}>{err}</p>} 
      </article> 
    </main> 
  ); 
} 
 
/apps/governance-web/.env.example (añade el servicio de sentimiento) 
VITE_SENTIMENT_BASE=http://localhost:8890 
 
/apps/governance-mobile/src/components/SentimentBadge.tsx 
import React from "react"; 
import { Text, View } from "react-native"; 
 
export default function SentimentBadge({ label }: { label: 
"positive"|"neutral"|"negative" }) { 
const txt = label === "positive" ? "Positivo" : label === "negative" 
? "Negativo" : "Neutral"; 
const bg  = label === "positive" ? "#DCFCE7" : label === "negative" 
? "#FEE2E2" : "#E5E7EB"; 
const fg  = label === "positive" ? "#166534" : label === "negative" 
? "#991B1B" : "#374151"; 
return ( 
<View accessible accessibilityLabel={`Tono ${txt}`} style={{ 
backgroundColor:bg, paddingHorizontal:8, paddingVertical:2, 
borderRadius:999 }}> 
<Text style={{ color: fg, fontWeight: "700" }}>{txt}</Text> 
</View> 
); 
} 
/apps/governance-mobile/src/hooks/useSentiment.ts 
export async function scoreTextMobile(text: string): 
Promise<"positive"|"neutral"|"negative"> { 
const base = process.env.EXPO_PUBLIC_SENTIMENT_BASE || 
"http://127.0.0.1:8890"; 
const r = await fetch(`${base}/score`, { method: "POST", headers: { 
"content-type":"application/json" }, body: JSON.stringify({ text }) 
}); 
const j = await r.json(); 
return j.label; 
} 
/apps/governance-mobile/src/screens/ProposalScreen.tsx (muestra badge si hay razones 
cargadas localmente) 
// ...resto import 
import SentimentBadge from "../components/SentimentBadge"; 
import { scoreTextMobile } from "../hooks/useSentiment"; 
export default function ProposalScreen({ route }: any) { 
// ...estado previo 
  const [tone, setTone] = 
useState<"positive"|"neutral"|"negative">("neutral"); 
 
  // ejemplo: si el usuario escribe razón, calculamos su tono (local) 
para UX 
  useEffect(() => { 
    if (reason && reason.length > 3) { 
      scoreTextMobile(reason).then((lbl)=>setTone(lbl)).catch(()=>{}); 
    } 
  }, [reason]); 
 
  return ( 
    <View style={{ padding: 16 }}> 
      {/* ... */} 
      <View style={{ marginTop: 8, alignSelf: "flex-start" }}> 
        <SentimentBadge label={tone} /> 
      </View> 
      {/* ... */} 
    </View> 
  ); 
} 
 
 
/apps/governance-web/README.md (añade N17) 
## N17 — Medir tono del debate (badges de sentimiento) 
 - **Servicio**: `@gnew/sentiment-service` (FastAPI + Transformers). 
Define `VITE_SENTIMENT_BASE` en esta app. - **UI**: En detalle de propuesta se muestra un **badge de tono** 
agregado a partir de las **razones on‑chain** (`VoteCast(reason)`). - **Accesibilidad**: colores con buen contraste y `role="status"` / 
`aria-label` para lectores de pantalla. 
 
### Validación (DoD) 
1. Arranca el servicio: 
   ```bash 
pnpm --filter @gnew/sentiment-service dev   # o docker run -p 
8890:8890 gnew/sentiment 
2. En esta app define VITE_SENTIMENT_BASE=http://localhost:8890 y visita una 
propuesta con razones. 
3. Verás el badge con el resumen: Pos/Neu/Neg (tooltip muestra distribución). 
Para la métrica de calidad, entrena/valida con tu propio conjunto y ejecuta: 
python apps/sentiment-service/scripts/evaluate.py --dataset 
apps/sentiment-service/data/val.csv 
4.  El objetivo es Macro‑F1 ≥ 0.80. Ajusta umbrales o finetunea si tu dominio difiere. 
