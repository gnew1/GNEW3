GNEW N58 — 6.8 Centro de ayuda interactivo (Prompt 58)
Objetivo
Ayuda contextual, buscador semántico local y flujos de soporte integrados para reducir tickets L1 y acelerar el “tiempo en valor”.
Roles responsables
●	Soporte (owner KPI): taxonomy, colas L1/L2.

●	Tech Writer: KB, “cómo empezar”, criterios de frescura.

●	Frontend: widget, vistas, tracking, a11y+i18n.

●	Data: embeddings, señales de relevancia, paneles.

Stack & convenciones
●	Contenido: MDX con frontmatter (title, slug, section, owner, lastReviewed, tags, audience, summary, version).

●	Semántica (local first): @xenova/transformers (all MiniLM L6 v2), embeddings locales + índice estático help-index.json.

●	Frontend: React 18 + Vite, TypeScript, React Router, i18n, ESLint/Prettier, Lighthouse ≥90 a11y/PWA.

●	Backend: Fastify (Node/TS), Postgres (feedback+tickets), OpenTelemetry→Prometheus/Grafana.

●	CI/CD: GitHub Actions (matrices), gated por Seguridad+Gobernanza.

●	Secrets: OIDC + store cifrado (Vault/KMS); ninguna clave en repos.

●	Docs (Docusaurus): “Arquitectura”, “APIs”, “Runbooks”, “Owners”, “Frescura”.

●	Legal/Privacidad: GDPR by design; feedback sin PII (seudónimo opcional).

Entregables
1.	Knowledge Base (KB) en MDX con “Cómo empezar”.

2.	Widget de ayuda contextual por pantalla.

3.	Buscador semántico (índice local) + fallback textual.

4.	Recomendaciones por error/evento (boundary/axios interceptor).

5.	Feedback por artículo (score 1–5 + texto).

6.	Flujos de ticket (crear, mensajes, estado) con owners por sección.

7.	Dashboards (reducción L1, CTR del widget, satisfacción).

 
Estructura del repo
apps/web/
  content/help/*.mdx
  content/help-index.json
  src/modules/help/
    context/HelpContext.tsx
    search/semanticSearch.ts
    components/{HelpWidget,HelpSearch,ArticleView,FeedbackForm,TicketFlow}.tsx
    data/error-map.ts
  src/pages/help/{HelpHome,HelpArticle}.tsx
services/helpdesk/
  src/{index.ts}
  migrations/001_init.sql
tools/
  build-help-index.ts
  validate-help-freshness.ts

 
Modelo de datos (Postgres)
services/helpdesk/migrations/001_init.sql
create table kb_owners(section text primary key, owner_email text not null);

create table kb_feedback(
  id bigserial primary key,
  slug text not null,
  score int check(score between 1 and 5),
  text text,
  user_anon_id text,
  ts timestamptz default now()
);

create table tickets(
  id uuid primary key default gen_random_uuid(),
  user_anon_id text,
  subject text not null,
  slug text,
  status text not null default 'open', -- open|pending|closed
  meta jsonb default '{}'::jsonb,
  ts timestamptz default now()
);

create table ticket_messages(
  id bigserial primary key,
  ticket_id uuid references tickets(id) on delete cascade,
  author text not null, -- user|agent
  body text not null,
  ts timestamptz default now()
);

 
Backend (Fastify · endpoints mínimos)
services/helpdesk/src/index.ts
import Fastify from "fastify"; import helmet from "@fastify/helmet"; import cors from "@fastify/cors";
import client from "prom-client"; import { z } from "zod"; import pg from "pg";
const app = Fastify({ logger: true }); app.register(helmet); app.register(cors,{origin:true});
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

client.collectDefaultMetrics({ prefix: "gnew_help_" });
app.get("/metrics", async (_r, rep) => { rep.header("Content-Type", client.register.contentType); return client.register.metrics(); });

app.post("/v1/feedback", async (req, rep) => {
  const b = z.object({ slug:z.string(), score:z.number().int().min(1).max(5).optional(), text:z.string().optional(), userAnonId:z.string().optional() }).parse(req.body);
  await pool.query("insert into kb_feedback(slug,score,text,user_anon_id) values ($1,$2,$3,$4)", [b.slug, b.score??null, b.text||"", b.userAnonId||null]);
  rep.code(201).send({ok:true});
});

app.post("/v1/tickets", async (req, rep) => {
  const b = z.object({ subject:z.string().min(3), body:z.string().min(3), slug:z.string().optional(), userAnonId:z.string().optional() }).parse(req.body);
  const t = await pool.query("insert into tickets(subject,slug,user_anon_id) values ($1,$2,$3) returning id",[b.subject,b.slug||null,b.userAnonId||null]);
  await pool.query("insert into ticket_messages(ticket_id,author,body) values ($1,'user',$2)",[t.rows[0].id,b.body]);
  rep.code(201).send({ id: t.rows[0].id });
});

app.post("/v1/tickets/:id/message", async (req, rep) => {
  const { id } = req.params as any;
  const b = z.object({ author:z.enum(["user","agent"]), body:z.string(), status:z.enum(["open","pending","closed"]).optional() }).parse(req.body);
  await pool.query("insert into ticket_messages(ticket_id,author,body) values ($1,$2,$3)", [id,b.author,b.body]);
  if (b.status) await pool.query("update tickets set status=$2 where id=$1", [id,b.status]);
  rep.send({ ok:true });
});

app.get("/v1/metrics/l1", async (_r, rep) => {
  const { rows } = await pool.query("select coalesce(slug,'_unknown') slug, count(*) total from tickets where status!='closed' group by 1 order by 2 desc");
  rep.send(rows);
});

app.get("/healthz", async()=>({ok:true}));
app.listen({ port: Number(process.env.PORT||8088), host: "0.0.0.0" });

 
Herramientas (índice semántico + frescura)
tools/build-help-index.ts
import fs from "node:fs/promises"; import path from "node:path"; import matter from "gray-matter";
import { pipeline } from "@xenova/transformers";
const root = path.resolve(__dirname, "..", "apps", "web", "content", "help");
const out = path.resolve(__dirname, "..", "apps", "web", "content", "help-index.json");

(async () => {
  const files = (await fs.readdir(root)).filter(f=>f.endsWith(".mdx"));
  // @ts-ignore
  const embed = await pipeline("feature-extraction","Xenova/all-MiniLM-L6-v2");
  const items:any[] = [];
  for (const f of files) {
    const raw = await fs.readFile(path.join(root,f), "utf8");
    const { data, content } = matter(raw);
    const text = `${data.title}\n${data.summary||""}\n${(data.tags||[]).join(" ")}\n${content.replace(/\W+/g," ")}`;
    const v:any = await embed(text,{ pooling:"mean", normalize:true });
    items.push({ slug:data.slug, title:data.title, section:data.section, owner:data.owner, tags:data.tags||[], vec:Array.from(v.data) });
  }
  await fs.writeFile(out, JSON.stringify({ model:"all-MiniLM-L6-v2", items }));
  console.log(`help-index generado (${items.length})`);
})();

tools/validate-help-freshness.ts
import fs from "node:fs/promises"; import path from "node:path"; import matter from "gray-matter";
const dir = path.resolve(__dirname,"..","apps","web","content","help"); const MAX=90;
(async ()=>{
  const files=(await fs.readdir(dir)).filter(f=>f.endsWith(".mdx"));
  const now=Date.now(); const bad:string[]=[]; const noOwner:string[]=[];
  for (const f of files) { const { data } = matter(await fs.readFile(path.join(dir,f),"utf8"));
    if (!data.owner) noOwner.push(data.slug||f);
    const d = new Date(data.lastReviewed||0).getTime();
    if (!d || (now-d)/86400000>MAX) bad.push(data.slug||f);
  }
  if (bad.length||noOwner.length){ console.error("KB inválida"); if(noOwner.length) console.error("Sin owner:",noOwner.join(",")); if(bad.length) console.error("Desactualizados:",bad.join(",")); process.exit(1); }
  console.log("KB OK");
})();

 
Frontend (componentes clave)
apps/web/src/modules/help/context/HelpContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
type Ctx={screen:string,errorCode?:string,setError:(c?:string)=>void};
const HelpCtx = createContext<Ctx>(null as any);
export function HelpProvider({children}:{children:React.ReactNode}) {
  const { pathname } = useLocation(); const [errorCode,setError] = useState<string|undefined>();
  const screen = useMemo(()=> pathname.replace(/\/\d+/g,"/:id"),[pathname]);
  return <HelpCtx.Provider value={{ screen, errorCode, setError }}>{children}</HelpCtx.Provider>;
}
export const useHelp = () => useContext(HelpCtx);

apps/web/src/modules/help/search/semanticSearch.ts
import index from "/apps/web/content/help-index.json";
const dot=(a:number[],b:number[])=>a.reduce((s,v,i)=>s+v*(b[i]||0),0);
const norm=(a:number[])=>Math.sqrt(dot(a,a))||1;
export async function encodeQuery(_q:string){ return []; } // fallback local (sin WASM)
export async function searchHelp(q:string,k=8){
  const items:any[]=(index as any).items||[]; if(!items.length) return [];
  const ql=q.toLowerCase();
  const scored = items
    .filter(it=> (it.title + (it.tags||[]).join(" ")).toLowerCase().includes(ql))
    .map((it:any)=>({ slug:it.slug, title:it.title, section:it.section, score:0 }));
  return scored.slice(0,k);
}

apps/web/src/modules/help/data/error-map.ts
export const ERROR_TO_ARTICLES:Record<string,string[]> = {
  INSUFFICIENT_GAS:["vote-errors"],
  WALLET_LOCKED:["getting-started","vote-errors"],
  PROPOSAL_CLOSED:["vote-errors"]
};
export const SCREEN_TO_ARTICLES:Record<string,string[]> = {
  "/onboarding":["getting-started"], "/dashboard":["vote-errors"]
};

apps/web/src/modules/help/components/HelpWidget.tsx
import React,{useEffect,useMemo,useState} from "react"; import { Link } from "react-router-dom";
import { useHelp } from "../context/HelpContext"; import { searchHelp } from "../search/semanticSearch";
import { ERROR_TO_ARTICLES, SCREEN_TO_ARTICLES } from "../data/error-map";

export default function HelpWidget(){
  const { screen, errorCode } = useHelp(); const [q,setQ] = useState(""); const [hits,setHits]=useState<any[]>([]);
  const seeds = useMemo(()=>[...(SCREEN_TO_ARTICLES[screen]||[]), ...((errorCode && ERROR_TO_ARTICLES[errorCode])||[])], [screen,errorCode]);
  useEffect(()=>{ (async()=> setHits(q? await searchHelp(q): seeds.map(s=>({slug:s,title:s}))))(); },[q,seeds.join(",")]);
  return (
    <aside className="card" style={{position:"fixed",right:16,bottom:16,width:360,maxWidth:"90vw",zIndex:50}}>
      <strong>¿Necesitas ayuda?</strong>
      <input placeholder="Busca por palabra clave…" value={q} onChange={e=>setQ(e.target.value)} aria-label="Buscar ayuda" style={{width:"100%",marginTop:8}} />
      <ul style={{listStyle:"none",padding:0,marginTop:8,display:"grid",gap:8}}>
        {hits.map(h=> <li key={h.slug}><Link to={`/help/${h.slug}`}>{h.title}</Link></li>)}
      </ul>
      <Link to="/help" className="button" style={{marginTop:8}}>Centro de ayuda</Link>
    </aside>
  );
}

apps/web/src/modules/help/components/ArticleView.tsx
import React,{useEffect,useState} from "react"; import { useParams } from "react-router-dom"; import FeedbackForm from "./FeedbackForm";
const mods = import.meta.glob("/apps/web/content/help/*.mdx");
export default function ArticleView(){
  const { slug="" } = useParams(); const [Mod,setMod]=useState<any>(null); const [fm,setFm]=useState<any>({});
  useEffect(()=>{ (async()=>{
    const entry = Object.entries(mods).find(([p])=>p.includes(`${slug}.mdx`));
    if(entry){ const m:any = await (mods as any)[entry[0]](); setMod(()=>m.default); setFm(m.frontmatter||{}); }
  })(); },[slug]);
  if(!Mod) return <div className="container">Cargando…</div>;
  return (
    <div className="container" style={{display:"grid",gap:16}}>
      <header className="card"><h1>{fm.title}</h1><div style={{opacity:.8,fontSize:13}}>Sección: {fm.section} · Dueño: {fm.owner} · v{fm.version} · revisado {fm.lastReviewed}</div></header>
      <article className="card"><Mod/></article>
      <FeedbackForm slug={slug}/>
    </div>
  );
}

apps/web/src/modules/help/components/FeedbackForm.tsx
import React,{useState} from "react"; import axios from "axios";
export default function FeedbackForm({slug}:{slug:string}){
  const [v,setV]=useState<number|undefined>(); const [txt,setTxt]=useState(""); const [ok,setOk]=useState(false);
  if(ok) return <div className="card">¡Gracias por tu feedback!</div>;
  return (
    <div className="card" role="region" aria-label="Feedback del artículo">
      <div>¿Te sirvió este artículo?</div>
      <div className="row" style={{gap:6,marginTop:6}}>{[1,2,3,4,5].map(n=><button key={n} className="button" aria-pressed={v===n} onClick={()=>setV(n)}>{n}</button>)}</div>
      <textarea rows={3} placeholder="Cuéntanos qué mejorar…" value={txt} onChange={e=>setTxt(e.target.value)} style={{width:"100%",marginTop:6}} />
      <button className="button" style={{marginTop:8}} onClick={async()=>{ await axios.post("/api/helpdesk/v1/feedback",{slug,score:v||null,text:txt}); setOk(true); }}>Enviar</button>
    </div>
  );
}

apps/web/src/modules/help/components/TicketFlow.tsx
import React,{useState} from "react"; import axios from "axios";
export default function TicketFlow({slug}:{slug?:string}){
  const [subject,setSubject]=useState(""); const [body,setBody]=useState(""); const [tid,setTid]=useState<string>();
  if(tid) return <div className="card">Ticket creado: <code>{tid}</code></div>;
  return (
    <div className="card">
      <h3 style={{marginTop:0}}>¿Aún necesitas ayuda?</h3>
      <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Asunto" />
      <textarea rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder="Describe el problema" />
      <button className="button" onClick={async()=>{ const {data} = await axios.post("/api/helpdesk/v1/tickets",{subject,body,slug}); setTid(data.id); }}>Crear ticket</button>
    </div>
  );
}

Rutas (web)
// apps/web/src/router/guards.tsx
import HelpHome from "@pages/help/HelpHome"; import HelpArticle from "@pages/help/HelpArticle";
import HelpWidget from "@modules/help/components/HelpWidget"; import { HelpProvider } from "@modules/help/context/HelpContext";
// ...
{ path: "/", element: (<HelpProvider><AppLayout/><HelpWidget/></HelpProvider>),
  children: [
    { path: "help", element: <HelpHome/> },
    { path: "help/:slug", element: <HelpArticle/> }
  ]
}

 
Pasos clave
1.	Taxonomía y owners (Soporte+TW): secciones, frontmatter obligatorio.

2.	Semillas KB: “Cómo empezar” + “Errores al votar”.

3.	Índice semántico local: pnpm tsx tools/build-help-index.ts en CI.

4.	Widget contextual en layout global; i18n y a11y (teclado/ARIA).

5.	Detección de errores/eventos: mapear ERROR_TO_ARTICLES + boundary HTTP.

6.	Feedback por artículo → métrica de satisfacción y “últimos 30 días”.

7.	Tickets L1 con owners por sección; runbooks de escalado.

8.	Observabilidad: métricas de L1, CTR del widget, tiempo a resolución.

 
CI/CD
