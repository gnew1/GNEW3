/* TL;DR y sugerencias heurísticas rápidas (<2s con cache) */ 
import crypto from "crypto"; 
import { performance } from "perf_hooks"; 
type Msg = { 
id: string; 
author?: string; 
role?: "owner" | "lead" | "mod" | "member" | "guest" | "bot"; 
text: string; 
ts?: number; // epoch ms 
}; 
export type SummarizeRequest = { 
conversationId?: string; 
messages: Msg[]; 
limit?: number; // nº bullets TL;DR 
lang?: "es" | "en"; 
}; 
export type SummarizeResponse = { 
tldr: string[]; 
suggestions: Array<{ type: string; title: string; reason: string; 
cta?: string }>; 
confidence: number; // 0..1 heurístico 
cache: { hit: boolean; ttl_s: number }; 
perf_ms: number; 
  meta: { key: string; items: number; lang: "es" | "en" }; 
}; 
 
// --- Cache TTL LRU (simple y sin dependencias) --- 
const MAX_ITEMS = 500; 
const TTL_MS = 10 * 60 * 1000; // 10 min 
const cache = new Map<string, { at: number; value: SummarizeResponse 
}>(); 
 
function getCache(k: string) { 
  const it = cache.get(k); 
  if (!it) return null; 
  const fresh = performance.now() - it.at < TTL_MS; 
  if (!fresh) { 
    cache.delete(k); 
    return null; 
  } 
  // LRU touch 
  cache.delete(k); 
  cache.set(k, it); 
  return it.value; 
} 
function setCache(k: string, v: SummarizeResponse) { 
  if (cache.size >= MAX_ITEMS) { 
    // delete oldest 
    const first = cache.keys().next().value; 
    cache.delete(first); 
  } 
  cache.set(k, { at: performance.now(), value: v }); 
} 
 
// --- Utilidades NLP livianas --- 
const STOP_ES = new Set( 
  
"de,la,que,el,en,y,a,los,del,se,las,por,un,para,con,no,una,su,al,lo,co
 mo,más,o,pero,sus,le,ya,o,este,si,porque,esta,entre,cuando,muy,sin,sob
 re,también,me,hasta,hay,donde,quien,desde,todo,nos,durante,todos,uno,l
 es,ni,contra,otros,ese,eso,ante,ellos,e,esto,mí,antes,algunos,qué,unos
,yo,otro,otras,otra,él,tanto,esa,estos,mucho,quienes,nada,muchos,cual,
 poco,ella,estar,estas,algunas,algo,nosotros,mi,mis,tú,te,ti,tu,tus,ell
 as,vosotros,vosotras,os,suyo,suya,suyos,suyas,nuestro,nuestra,nuestros
 ,nuestras,vuestro,vuestros,vuestas,vuesta,es,era,eres,sois,son,sea,ser
 á,fue,han,he,has,hay,está,están,estoy,estamos,estuve,estuvimos,estaban
 ,estábamos,estará,habrá,habría,habíamos,habían".split( 
    "," 
  ) 
); 
const STOP_EN = new Set( 
  
"the,of,and,to,in,a,is,that,for,on,with,as,are,it,was,by,be,at,from,or
 ,an,this,which,not,have,has,had,but,they,were,their,its,been,more,can,
 also,we,our,you,he,she,his,her,them,those,these,there,when,who,what,ho
 w,why,where,will,would,should,could,do,does,did,so,than,then,if".split
 ( 
    "," 
  ) 
); 
 
function detectLang(msgs: Msg[]): "es" | "en" { 
  const txt = msgs.map(m => m.text).join(" ").toLowerCase(); 
  const hitsEs = ["que", "para", "con", "como", "más", "también", "¿", 
"¡"].reduce( 
    (a, w) => a + (txt.includes(w) ? 1 : 0), 
    0 
  ); 
  const hitsEn = ["that", "which", "also", "don't", "should", 
"would"].reduce( 
    (a, w) => a + (txt.includes(w) ? 1 : 0), 
    0 
  ); 
  return hitsEs >= hitsEn ? "es" : "en"; 
} 
 
function sentences(text: string): string[] { 
  return text 
    .split(/(?<=[\.\!\?\…]|[\.\!\?]\”|\.”|\?”|\!”)\s+|\n+/g) 
    .map(s => s.trim()) 
    .filter(Boolean); 
} 
 
function tokenize(text: string, lang: "es" | "en") { 
  const stop = lang === "es" ? STOP_ES : STOP_EN; 
  return text 
    .toLowerCase() 
    .normalize("NFKD") 
    .replace(/[^\p{L}\p{N}\s]/gu, " ") 
    .split(/\s+/) 
    .filter(w => w && !stop.has(w) && w.length > 2); 
} 
 
function scoreSentences(msgs: Msg[], lang: "es" | "en") { 
  const allText = msgs.map(m => m.text).join(" "); 
  const toks = tokenize(allText, lang); 
  const freq = new Map<string, number>(); 
  toks.forEach(w => freq.set(w, (freq.get(w) || 0) + 1)); 
  const maxF = Math.max(...Array.from(freq.values()), 1); 
 
  const S: Array<{ s: string; score: number }> = []; 
  const now = Date.now(); 
 
  msgs.forEach(m => { 
    const recency = m.ts ? Math.max(0.6, 1 - (now - m.ts) / (7 * 24 * 
3600e3)) : 1; // ≥0.6 
    const roleBoost = 
      m.role === "owner" || m.role === "lead" 
        ? 1.25 
        : m.role === "mod" 
        ? 1.15 
        : m.role === "bot" 
        ? 0.9 
        : 1; 
 
    sentences(m.text).forEach(s => { 
      const stoks = tokenize(s, lang); 
      if (!stoks.length) return; 
      const tf = stoks.reduce((a, w) => a + (freq.get(w)! / maxF), 0) 
/ stoks.length; 
      const lenPenalty = Math.min(1, 60 / Math.max(10, s.length)); // 
preferir concisas 
      const score = tf * recency * roleBoost * lenPenalty; 
      S.push({ s, score }); 
    }); 
  }); 
 
  // MMR para diversidad simple 
  const selected: string[] = []; 
  const selectedScores: number[] = []; 
  const K = Math.min(8, Math.max(3, Math.ceil(S.length * 0.1))); 
  const lambda = 0.75; 
 
  const sim = (a: string, b: string) => { 
    const ta = new Set(tokenize(a, lang)); 
    const tb = new Set(tokenize(b, lang)); 
    const inter = Array.from(ta).filter(w => tb.has(w)).length; 
    return inter / Math.max(1, Math.min(ta.size, tb.size)); 
  }; 
 
  const pool = S.sort((a, b) => b.score - a.score).map(x => ({ ...x 
})); 
  while (selected.length < K && pool.length) { 
    let bestIdx = 0; 
    let bestMMR = -Infinity; 
    for (let i = 0; i < pool.length; i++) { 
      const cand = pool[i]; 
      const maxSim = selected.length 
        ? Math.max(...selected.map(s0 => sim(cand.s, s0))) 
        : 0; 
      const mmr = lambda * cand.score - (1 - lambda) * maxSim; 
      if (mmr > bestMMR) { 
        bestMMR = mmr; 
        bestIdx = i; 
      } 
    } 
    const [pick] = pool.splice(bestIdx, 1); 
    selected.push(pick.s); 
    selectedScores.push(pick.score); 
  } 
 
  return { selected, avgScore: selectedScores.reduce((a, b) => a + b, 
0) / (selectedScores.length || 1) }; 
} 
 
function buildSuggestions(msgs: Msg[], lang: "es" | "en") { 
  const text = msgs.map(m => m.text).join("\n"); 
  const unresolvedQs = sentences(text).filter(s => 
/\?$|¿.*\?$/.test(s.trim())); 
  const blockers = sentences(text).filter(s => 
    
/(bloquea|bloqueado|depend|esperando|blocked|dependency|risk|riesgo)/i
 .test(s) 
  ); 
  const actions = sentences(text).filter(s => 
    /(^|\s)(deber(íamos|iamos)|hay 
que|propongo|asign(ar|emos)|let'?s|we should|we 
need|action:)/i.test(s) 
  ); 
  const decisions = sentences(text).filter(s => 
    
/(decid(i|ido)|acord(amos|ado)|consenso|consensus|approved|rechazado|v
 otar)/i.test(s) 
  ); 
 
  const S = (title: string, reason: string, type: string, cta?: 
string) => ({ 
    type, 
    title, 
    reason, 
    cta, 
  }); 
 
  const sug: Array<{ type: string; title: string; reason: string; 
cta?: string }> = []; 
 
  if (unresolvedQs.length) { 
    const title = lang === "es" ? "Resolver preguntas abiertas" : 
"Resolve open questions"; 
    sug.push( 
      S( 
        title, 
        (lang === "es" 
          ? "Detectadas preguntas sin respuesta: " 
          : "Detected open questions: ") + unresolvedQs.slice(0, 
3).join(" | "), 
        "question", 
        lang === "es" ? "Asignar responsables y plazos" : "Assign 
owners and due dates" 
      ) 
    ); 
  } 
  if (blockers.length) { 
    const title = lang === "es" ? "Desbloquear dependencias" : 
"Unblock dependencies"; 
    sug.push( 
      S( 
        title, 
        (lang === "es" ? "Bloqueos mencionados: " : "Mentioned 
blockers: ") + 
          blockers.slice(0, 3).join(" | "), 
        "blocker", 
        lang === "es" ? "Crear sub-tareas para cada bloqueo" : "Create 
sub-tasks per blocker" 
      ) 
    ); 
  } 
  if (actions.length) { 
    const title = lang === "es" ? "Acciones propuestas" : "Proposed 
actions"; 
    sug.push( 
      S( 
        title, 
        (lang === "es" ? "Acciones detectadas: " : "Detected actions: 
") + 
          actions.slice(0, 3).join(" | "), 
        "action", 
        lang === "es" ? "Convertir en issues y asignar" : "Convert to 
issues and assign" 
      ) 
    ); 
  } 
  if (decisions.length) { 
    const title = lang === "es" ? "Registrar decisiones" : "Record 
decisions"; 
    sug.push( 
      S( 
        title, 
        (lang === "es" ? "Decisiones/consenso: " : 
"Decisions/consensus: ") + 
          decisions.slice(0, 3).join(" | "), 
        "decision", 
        lang === "es" ? "Publicar resumen y notificar" : "Publish 
recap and notify" 
      ) 
    ); 
  } 
 
  if (!sug.length) { 
    sug.push( 
      S( 
        lang === "es" ? "Sin hallazgos críticos" : "No critical 
findings", 
        lang === "es" 
          ? "No se detectaron preguntas, bloqueos ni decisiones 
explícitas." 
          : "No explicit questions, blockers, or decisions found.", 
        "info" 
      ) 
    ); 
  } 
 
  return sug; 
} 
 
export function summarize(req: SummarizeRequest): SummarizeResponse { 
  const t0 = performance.now(); 
 
  if (!req || !Array.isArray(req.messages) || !req.messages.length) { 
    throw new Error("Invalid payload: messages[] requerido"); 
  } 
  const lang = req.lang ?? detectLang(req.messages); 
  const limit = Math.min(10, Math.max(3, req.limit ?? 5)); 
 
  // key por contenido 
  const hash = crypto 
    .createHash("sha256") 
    .update( 
      JSON.stringify({ 
        conversationId: req.conversationId ?? "", 
        messages: req.messages.map(m => ({ 
          a: m.author || "", 
          r: m.role || "", 
          t: m.text, 
          ts: m.ts || 0, 
        })), 
        limit, 
        lang, 
      }) 
    ) 
    .digest("hex"); 
 
  const key = `summ:${hash}`; 
  const cached = getCache(key); 
  if (cached) { 
    return { 
      ...cached, 
      cache: { hit: true, ttl_s: Math.floor((TTL_MS - 
(performance.now() - (cache.get(key)!.at))) / 1000) }, 
      perf_ms: Math.round(performance.now() - t0), 
    }; 
  } 
 
  // TL;DR por frases representativas (extractivo con diversidad) 
  const { selected, avgScore } = scoreSentences(req.messages, lang); 
  const tldr = selected.slice(0, limit); 
 
  const suggestions = buildSuggestions(req.messages, lang); 
 
  const resp: SummarizeResponse = { 
    tldr, 
    suggestions, 
    confidence: Math.max(0.35, Math.min(0.95, avgScore)), // cota útil 
    cache: { hit: false, ttl_s: Math.floor(TTL_MS / 1000) }, 
    perf_ms: Math.round(performance.now() - t0), 
    meta: { key, items: req.messages.length, lang }, 
  }; 
 
  setCache(key, resp); 
  return resp; 
} 
 
