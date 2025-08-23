/** Utilidades para narrativas legibles de explicación. */ 
export type Item = { kind:string; contrib:number; 
mult:Record<string,number>; ts:number }; 
 
export function humanizeItem(it: Item): string { 
  const kmap:Record<string,string>={ 
    vote:"un voto en gobernanza", 
    proposal_accepted:"una propuesta aceptada", 
    reward_claim:"una recompensa", 
    sbt_badge:"un badge SBT", 
    pr_merged:"un PR mergeado", 
    code_review:"una revisión de código útil", 
    forum_answer:"una respuesta aceptada", 
    stake_time_gnew0:"stake productivo" 
  }; 
  const m = it.mult || {}; 
  const effects = [ 
    m.p_vel!==undefined ? `velocidad ${mul(m.p_vel)}` : "", 
    m.p_div!==undefined ? `diversidad ${mul(m.p_div)}` : "", 
    m.p_col!==undefined ? `colusión ${mul(m.p_col)}` : "", 
    m.p_qual!==undefined ? `calidad ${mul(m.p_qual)}` : "", 
    m.p_id!==undefined ? `identidad ${mul(m.p_id)}` : "", 
  ].filter(Boolean).join(", "); 
  return `+${it.contrib.toFixed(2)} por 
${kmap[it.kind]||it.kind}${effects?` (multiplicadores: 
${effects})`:""}.`; 
} 
 
function mul(x:number){ return x.toFixed(2)+"×"; } 
 
export function improvementTips(items: Item[]): string[] { 
  // Heurística simple: detectar multiplicadores bajos 
  const tips: string[] = []; 
  const last30 = items.filter(i=> (Date.now()/1000 - i.ts) < 
30*86400); 
  const avg = (arr:number[])=> 
arr.reduce((a,b)=>a+b,0)/Math.max(1,arr.length); 
  const vel = avg(last30.map(i=>i.mult?.p_vel??1)); 
  if (vel < 0.8) tips.push("Espacia tus aportaciones para evitar 
penalización por velocidad."); 
  const div = avg(last30.map(i=>i.mult?.p_div??1)); 
  if (div < 0.9) tips.push("Diversifica tus tipos de contribución para 
mejorar el multiplicador de diversidad."); 
  const col = avg(last30.map(i=>i.mult?.p_col??1)); 
  if (col < 0.9) tips.push("Colabora con más contrapartes para reducir 
señales de colusión."); 
  const qual = avg(last30.map(i=>i.mult?.p_qual??1)); 
  if (qual < 1.0) tips.push("Mejora la calidad: añade tests, 
documentación y busca feedback."); 
  return tips; 
} 
 
 
