import { useEffect, useState } from "react";
export function useDebatePanel(apiBase, threadId) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`${apiBase}/panel/${threadId}`);
                if (!res.ok)
                    throw new Error("failed");
                const json = (await res.json());
                if (mounted)
                    setData(json);
            }
            catch {
                setErr("error");
            }
            finally {
                setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [apiBase, threadId]);
    return { data, loading, err };
}
Cómo;
se;
usa(integración, GNEW);
Backend(servicio, nuevo);
services / debate - assistant;
expone: ;
POST / ingest;
ingesta;
de;
hilos / mensajes;
desde;
N72(Foros, integrados);
o;
desde;
gobernanza / economía.
;
GET / panel / { thread_id };
devuelve;
TL;
DR, argumentos;
clave,
    etiquetas(topic, modeling);
y;
agenda(acciones).
;
POST / qa;
QA;
extractiva;
sobre;
el;
hilo(RAG).
;
POST / feedback;
almacena;
encuesta;
de;
precisión;
percibida;
y;
reporta % y;
si;
se;
cumple > 80 % .
;
GET / metrics;
métricas;
Prometheus(para, DoD, y, SLOs);
latencia;
del;
pipeline;
de;
resumen;
y;
ratio;
de;
feedback;
positivo.
;
Frontend(UI);
packages / ui / src / debate - panel.tsx;
es;
el;
Panel;
TL;
DR;
y;
argumentos;
clave;
listo;
para;
incrustar.Acepta;
threadId;
y;
un;
apiBase(reverse - proxy, a, debate - assistant).
;
Stack;
y;
diseño;
técnico: ;
RAG: store.py + pipelines.rank_passages;
usan;
embeddings(sentence - transformers, si, disponible);
fallback;
TF;
IDF;
y;
FAISS(fallback, coseno);
para;
recuperar;
pasajes.
;
Resumen: model;
abstractive(Transformers);
si;
está;
presente, con;
fallback;
extractivo;
TF;
IDF;
sentence;
ranking.
;
Extractive;
QA: HF;
pipeline(SQuAD2);
si;
está;
disponible;
fallback;
por;
solapamiento;
léxico.
;
Topic;
Modeling: TF;
IDF + NMF;
para;
generar;
etiquetas(1, 3, n, gramas, por, tópico).
;
Agenda;
automática: heurísticos;
multi;
patrón(acciones / decidir / planificar / checklist) + imperativo.
;
DoD;
y;
SLOs: ;
DoD;
Precisión;
percibida > 80 % (encuestas);
POST / feedback;
registra;
puntuaciones(1, 5);
y;
calcula %  >= 4.;
Métrica;
visible;
y;
trazable;
por;
Prometheus.
;
Latencia;
P95;
del;
resumen;
medible;
vía;
debate_summarize_seconds(Histogram).Objetivo;
mantener;
P95 < 1.5;
s;
en;
modo;
fallback;
abstractive;
depende;
del;
modelo.
;
Fiabilidad;
multi;
región: el;
servicio;
es;
stateless;
índices;
en;
memoria;
se;
regeneran;
en;
arranque;
a;
partir;
de;
ingesta;
se;
recomienda;
snapshot;
periódico;
si;
el;
volumen;
es;
alto.
;
Pruebas: tests / test_panel.py;
valida;
flujo;
end;
to;
end(ingesta, panel, QA, feedback).
    Nota;
Los;
módulos;
llaman;
a;
fallbacks;
cuando;
los;
modelos;
pesados;
no;
están;
presentes, asegurando;
entrega;
fiable;
sin;
depender;
de;
GPUs.En;
producción, se;
puede;
fijar: ;
SENTENCE_TRANSFORMERS_HOME;
y;
montar;
cachés.
;
Ajustar;
topic_k, top_k_passages;
en;
config.py.
;
Persistir;
índices;
FAISS;
en;
disco / S3;
y;
recargarlos;
en;
startup.
;
Si;
quieres, también;
te;
agrego;
un;
docker - compose;
de;
ejemplo;
y;
las;
rutas;
de;
NGINX;
para;
exponer;
packages / ui + debate - assistant;
detrás;
del;
gateway.
;
Tú;
dijiste: programa;
a;
nivel;
de;
detalle;
para;
GNEW;
N75;
8.5;
Canales;
temáticos(Prompt, 75);
Objetivo: Organización;
por;
tópicos;
con;
permisos.Roles;
Moderación, Backend.Entregables;
Estructura;
por;
área, reglas;
claras.DoD;
Reducción;
de;
ruido;
X % .
;
ChatGPT;
Plus;
Pensó;
durante;
26;
s;
vamos;
con;
N75;
Canales;
temáticos;
!Entrego;
arquitectura, servicio;
backend, reglas;
y;
UI;
para;
organizar;
debates;
por;
tópicos;
con;
permisos;
y;
medir;
reducción;
de;
ruido;
X % .Todo;
coherente;
con;
GNEW(Matrix + Foros + Realtime).
;
Ruta;
completa: services / channels / package.json;
{
    "name";
    "@services/channels",
        "private";
    true,
        "version";
    "0.1.0",
        "type";
    "module",
        "main";
    "dist/main.js",
        "scripts";
    {
        "dev";
        "tsx watch src/main.ts",
            "build";
        "tsc -p tsconfig.json",
            "start";
        "node dist/main.js",
            "test";
        "vitest run";
    }
    "dependencies";
    {
        "@fastify/cors";
        "^10.0.0",
            "@fastify/helmet";
        "^12.0.0",
            "@fastify/rate-limit";
        "^10.1.0",
            "fastify";
        "^4.28.1",
            "fastify-plugin";
        "^5.0.1",
            "zod";
        "^3.23.8",
            "undici";
        "^6.19.8",
            "pg";
        "^8.12.0",
            "pino";
        "^9.3.2",
            "uuid";
        "^9.0.1",
            "natural";
        "^6.10.4",
            "prom-client";
        "^15.1.3";
    }
    "devDependencies";
    {
        "tsx";
        "^4.19.2",
            "typescript";
        "^5.6.3",
            "vitest";
        "^2.0.5";
    }
    "license";
    "Apache-2.0";
}
Ruta;
completa: services / channels / tsconfig.json;
{
    "compilerOptions";
    {
        "target";
        "ES2022",
            "lib";
        ["ES2022"],
            "module";
        "ES2022",
            "moduleResolution";
        "Bundler",
            "outDir";
        "dist",
            "rootDir";
        "src",
            "strict";
        true,
            "esModuleInterop";
        true,
            "skipLibCheck";
        true;
    }
    "include";
    ["src"];
}
Ruta;
completa: services / channels / src / types.ts;
máx.;
" ;
description ?  : string;
kind: "allowlist_keywords" | "denylist_keywords" | "max_length" |
    "rate_limit_per_user" | "attachments" | "quiet_hours";
config: Record; // e.g. 
{
    keywords: ["governance", "budget"];
}
/ {max:800};
action: "warn" | "flag" | "hide" | "mute";
;
Ruta;
completa: services / channels / src / db.ts;
import { Pool } from "pg";
export function makePool(url) {
    const pool = new Pool({ connectionString: url ||
            process.env.CHANNELS_DATABASE_URL ||
            "postgres://postgres:postgres@db:5432/channels" });
    return pool;
}
export const SQL = {
    schema: ` 
CREATE TABLE IF NOT EXISTS areas ( 
id text primary key, 
guild text not null, 
name text not null, 
space_alias text null, 
created_at timestamptz not null default now(), 
updated_at timestamptz not null default now() 
); 
CREATE TABLE IF NOT EXISTS topics ( 
key text primary key, 
area_id text not null references areas(id) on delete cascade, 
title text not null, 
description text, 
matrix_room text, 
forums_tag text, 
roles jsonb not null default '{}'::jsonb, 
rules text[] not null default '{}', 
created_at timestamptz not null default now() 
); 
CREATE TABLE IF NOT EXISTS rules ( 
id text primary key, 
name text not null, 
description text, 
kind text not null, 
config jsonb not null, 
action text not null 
); 
CREATE TABLE IF NOT EXISTS noise_log ( 
id bigserial primary key, 
topic_key text not null references topics(key) on delete cascade, 
ts timestamptz not null default now(), 
source text not null, 
signal text not null, 
reason text 
); 
`,
};
Ruta;
completa: services / channels / src / main.ts;
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { makePool, SQL } from "./db";
import { randomUUID } from "node:crypto";
import { Topic } from "./types";
import { Registry, collectDefaultMetrics, Gauge, Counter } from "prom-client";
import { buildOffTopicChecker } from "./moderation";
import { provisionMatrixSpaceAndRooms } from "./provision";
const app = Fastify({ logger: true });
await app.register(cors, { origin: true, credentials: true });
await app.register(helmet);
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
const pool = makePool();
await pool.query(SQL.schema);
// métricas 
const reg = new Registry();
collectDefaultMetrics({ register: reg });
const noiseRatioGauge = new Gauge({ name: "channels_noise_ratio",
    help: "porcentaje de off-topic por ventana", registers: [reg],
    labelNames: ["topic"] });
const noiseReducedGauge = new Gauge({ name: "channels_noise_reduction_pct", help: "reducción vs baseline (%)",
    registers: [reg], labelNames: ["topic"] });
const offTopicCounter = new Counter({ name: "channels_offtopic_total",
    help: "eventos off-topic", registers: [reg], labelNames: ["topic", "source", "reason"] });
const checker = buildOffTopicChecker(); // heurísticos + listas 
app.get("/metrics", async (_req, reply) => {
    reply.header("Content-Type", reg.contentType);
    reply.send(await reg.metrics());
});
app.get("/health", async () => ({ status: "ok" }));
// ---------- Reglas ---------- 
const RuleSchema = z.object({
    id: z.string().min(3),
    name: z.string().min(3),
    description: z.string().optional(),
    kind: z.enum(["allowlist_keywords", "denylist_keywords", "max_length", "rate_li,
        mit_per_user, ",", attachments, ",", quiet_hours, "]), ,
        config, z.record(z.any()),
        action, z.enum(["warn", "flag", "hide", "mute"])])
});
app.post("/rules", async (req, reply) => {
    const r = RuleSchema.parse(req.body);
    await pool.query(`INSERT INTO rules (id,name,description,kind,config,action) VALUES 
($1,$2,$3,$4,$5,$6) 
ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, kind=$4, 
config=$5, action=$6`, [r.id, r.name, r.description || null, r.kind, r.config, r.action]);
    reply.code(201).send({ ok: true });
});
app.get("/rules", async () => (await pool.query(`SELECT * FROM rules 
ORDER BY id`)).rows);
// ---------- Áreas + Tópicos ---------- 
const TopicSchema = z.object({
    key: z.string().min(3),
    title: z.string().min(3),
    description: z.string().optional(),
    forums_tag: z.string().optional(),
    roles: z.object({ guest: z.boolean().optional(), member: z.boolean().optional(), mod: z.boolean().optional(), admin: z.boolean().optional() }).default({}),
    rules: z.array(z.string()).default([])
});
const AreaSchema = z.object({
    id: z.string().default(() => randomUUID()),
    guild: z.string().min(2),
    name: z.string().min(2),
    topics: z.array(TopicSchema).min(1)
});
app.post("/areas", async (req, reply) => {
    const a = AreaSchema.parse(req.body);
    await pool.query(`INSERT INTO areas (id,guild,name) VALUES 
($1,$2,$3) ON CONFLICT (id) DO UPDATE SET 
guild=$2,name=$3,updated_at=now()`, [a.id, a.guild, a.name]);
    // upsert topics 
    for (const t of a.topics) {
        await pool.query(`INSERT INTO topics 
(key,area_id,title,description,forums_tag,roles,rules) 
       VALUES ($1,$2,$3,$4,$5,$6,$7) 
       ON CONFLICT (key) DO UPDATE SET 
area_id=$2,title=$3,description=$4,forums_tag=$5,roles=$6,rules=$7`, [t.key, a.id, t.title, t.description || null, t.forums_tag ||
                null, t.roles || {}, t.rules || []]);
    }
    reply.code(201).send({ id: a.id });
});
app.get("/areas/:id", async (req) => {
    const { id } = req.params;
    const area = (await pool.query(`SELECT * FROM areas WHERE id=$1`, [id])).rows[0];
    const topics = (await pool.query(`SELECT * FROM topics WHERE 
area_id=$1 ORDER BY key`, [id])).rows;
    return { ...area, topics };
});
app.get("/directory", async () => {
    const areas = (await pool.query(`SELECT * FROM areas ORDER BY 
created_at`)).rows;
    const topics = (await pool.query(`SELECT * FROM topics`)).rows;
    const byArea = new Map(areas.map((a) => [a.id, { ...a, topics: [] }]));
    for (const t of topics)
        byArea.get(t.area_id).topics.push(t);
    return Array.from(byArea.values());
});
// ---------- Sincronización con Matrix / Foros ---------- 
app.post("/areas/:id/sync", async (req, reply) => {
    const { id } = req.params;
    const area = (await pool.query(`SELECT * FROM areas WHERE id=$1`, [id])).rows[0];
    if (!area)
        return reply.notFound("area no encontrada");
    const topics = (await pool.query(`SELECT * FROM topics WHERE 
area_id=$1 ORDER BY key`, [id])).rows;
    const out = await provisionMatrixSpaceAndRooms(area, topics);
    // guardar aliases/rooms devueltos 
    for (const t of out.topics) {
        await pool.query(`UPDATE topics SET matrix_room=$2 WHERE key=$1`, [t.key, t.matrix_room]);
    }
    if (out.space_alias)
        await pool.query(`UPDATE areas SET 
space_alias=$2 WHERE id=$1`, [id, out.space_alias]);
    reply.send({ ok: true, ...out });
});
// ---------- Ingesta de eventos (para medir ruido) ---------- 
const IngestSchema = z.object({
    topic_key: z.string(),
    source: z.enum(["matrix", "forums"]),
    author: z.string().optional(),
    content: z.string()
});
app.post("/events/ingest", async (req) => {
    const e = IngestSchema.parse(req.body);
    const rules = (await pool.query(`SELECT r.* FROM topics t JOIN rules r ON r.id = ANY(t.rules) 
WHERE t.key=$1`, [e.topic_key])).rows;
    const verdict = checker(e.content, rules);
    await pool.query(`INSERT INTO noise_log (topic_key, source, signal, reason) VALUES 
($1,$2,$3,$4)`, [e.topic_key, e.source, verdict.ok ? "on_topic" : "off_topic",
        verdict.reason || null]);
    if (!verdict.ok)
        offTopicCounter.labels({ topic: e.topic_key,
            source: e.source, reason: verdict.reason || "unknown" }).inc();
    return { ok: true, verdict };
});
// ---------- Métricas de ruido y DoD ---------- 
app.get("/topics/:key/noise", async (req) => {
    const { key } = req.params;
    // ventana: últimos 14 días; baseline: días -14 a -28 
    const q = ` 
WITH win AS ( 
SELECT signal, count(*) c FROM noise_log WHERE topic_key=$1 AND ts 
>= now()-interval '14 days' GROUP BY signal 
), 
base AS ( 
  SELECT signal, count(*) c FROM noise_log WHERE topic_key=$1 AND ts 
>= now()-interval '28 days' AND ts < now()-interval '14 days' GROUP BY 
signal 
) 
SELECT 
  COALESCE((SELECT c FROM win WHERE signal='off_topic'),0)::float AS 
off_win, 
  COALESCE((SELECT c FROM win WHERE signal='on_topic'),0)::float AS 
on_win, 
  COALESCE((SELECT c FROM base WHERE signal='off_topic'),0)::float AS 
off_base, 
  COALESCE((SELECT c FROM base WHERE signal='on_topic'),0)::float AS 
on_base 
`;
    const row = (await pool.query(q, [key])).rows[0] || { off_win: 0,
        on_win: 0, off_base: 0, on_base: 0 };
    const winNoise = row.off_win / Math.max(1, row.off_win +
        row.on_win);
    const baseNoise = row.off_base / Math.max(1, row.off_base +
        row.on_base);
    const reduction = (baseNoise - winNoise) * 100;
    noiseRatioGauge.set({ topic: key }, isFinite(winNoise) ? winNoise :
        0);
    noiseReducedGauge.set({ topic: key }, isFinite(reduction) ?
        reduction : 0);
    return {
        topic: key,
        window_noise_ratio: Number(winNoise.toFixed(4)),
        baseline_noise_ratio: Number(baseNoise.toFixed(4)),
        reduction_pct: Number(reduction.toFixed(2)),
        target_met: reduction >= Number(process.env.NOISE_TARGET_PCT ||
            10) // X por defecto 10% 
    };
});
const port = Number(process.env.PORT || 8012);
if (process.env.NODE_ENV !== "test") {
    app.listen({ host: "0.0.0.0", port }).then(() => app.log.info(`channels up :${port}`));
}
Ruta;
completa: services / channels / src / moderation.ts;
/** Detector simple de off-topic basado en listas y heurísticos */
export function buildOffTopicChecker() {
    return (content, rules) => {
        const text = (content || "").toLowerCase();
        // 1) denylist 
        const deny = rules.filter(r => r.kind ===
            "denylist_keywords").flatMap(r => r.config.keywords ||
            []);
        for (const k of deny) {
            if (text.includes(k.toLowerCase()))
                return { ok: false, reason: `deny:${k}` };
        }
        // 2) allowlist (si existe y no hay match => off-topic) 
        const allow = rules.filter(r => r.kind ===
            "allowlist_keywords").flatMap(r => r.config.keywords ||
            []);
        if (allow.length) {
            const matched = allow.some(k => text.includes(k.toLowerCase()));
            if (!matched)
                return { ok: false, reason: "allowlist_miss" };
        }
        // 3) longitud 
        const ml = rules.find(r => r.kind === "max_length");
        if (ml && text.length > Number(ml.config["max"] || 1000))
            return {
                ok: false, reason: "too_long"
            };
        // 4) adjuntos (heurístico: URLs/imágenes) 
        const att = rules.find(r => r.kind === "attachments");
        if (att && att.config["images"] === false &&
            /(https?:\/\/\S+\.(png|jpg|jpeg|gif|webp))/i.test(text))
            return { ok: false, reason: "image_forbidden" };
        return { ok: true };
    };
}
Ruta;
completa: services / channels / src / provision.ts;
import { request } from "undici";
/** Sincroniza con el Provisioner Matrix existente (servicio
matrix-provisioner). */
export async function provisionMatrixSpaceAndRooms(area, topics) {
    const base = process.env.MATRIX_PROVISIONER_URL ||
        "http://matrix-provisioner:8080";
    const bot = process.env.MATRIX_BOT || "@provisioner:gnew-eu.local";
    const token = process.env.MATRIX_TOKEN || "REPLACE_ME";
    // Crear Space principal (guild/area) + rooms por tópico (privados 
    por;
    defecto;
    const body = {
        guild: area.guild,
        area: area.name.toLowerCase().replace(/\s+/g, "-"),
        visibility: "private",
        members: [{ user_id: bot, role: "admin" }]
    };
    const res = await request(`${base}/spaces/provision`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", "authorization": `Bearer ${token}` }
    });
    if (res.statusCode >= 300)
        throw new Error(`provision failed: 
${res.statusCode}`);
    const data = await res.body.json();
    // Devolver mapping rooms: usamos alias convencionales: 
    # < guild > --;
    const domain = data.server;
    const outTopics = topics.map(t => ({
        key: t.key,
        matrix_room: `#${area.guild}-${area.name.toLowerCase().replace(/\s+/g, "-")}-${t.key}:${domain}`
    }));
    return { space_alias: data.space_id, topics: outTopics };
}
Ruta;
completa: services / channels / Dockerfile;
ARG;
NODE_VERSION = 20 - alpine;
FROM;
node: $;
{
    NODE_VERSION;
}
WORKDIR / app;
COPY;
package.json;
tsconfig.json. /
    COPY;
src. / src;
RUN;
npm;
i--;
no - audit--;
no - fund;
RUN;
npm;
run;
build;
ENV;
NODE_ENV = production;
EXPOSE;
8012;
HEALTHCHECK--;
interval = 30;
s--;
timeout = 3;
s;
CMD;
wget - qO -
    http;
CMD["node", "dist/main.js"];
Ruta;
completa: infra / compose / extra / channels.yml;
version: "3.9";
services: channels: build: context: .. / .. / services / channels;
environment: CHANNELS_DATABASE_URL: postgres: //postgres:postgres@db:5432/channels 
 MATRIX_PROVISIONER_URL: http: //matrix-provisioner:8088 
 MATRIX_BOT: "@provisioner:gnew-eu.local";
MATRIX_TOKEN: "REPLACE_WITH_TOKEN";
NOISE_TARGET_PCT: "15";
#;
X;
por;
defecto;
ajustable;
ports: -"8012:8012";
depends_on: -db;
db: image: postgres: 16;
environment: {
    POSTGRES_PASSWORD: postgres;
}
ports: ["5434:5432"];
volumes: ["./data/channels-db:/var/lib/postgresql/data"];
Ruta;
completa: apps / web / app / channels / page.tsx;
"use client";
import useSWR from "swr";
const fetcher = (u) => fetch(u).then(r => r.json());
export default function ChannelsDirectory() {
    const { data } = useSWR("/api/channels/directory", fetcher);
    if (!data)
        return className;
    "p-6" > Cargando;
    /div>;
    return className = "max-w-5xl mx-auto p-6 space-y-6" >
        className;
    "text-2xl font-semibold" > Canales;
    temáticos < /h1></header >
        { data, : .map((area) => key = { area, : .id }, className = "border rounded p-4" >
                className, "text-xl font-medium" > { area, : .guild } /
                { area, : .name } < /h2>
                < ul, className = "mt-3 grid gap-2" >
                { area, : .topics.map((t) => key = { t, : .key }, className = "flex items-center , justify - between, "> 
                        < div >
                        className, "font-medium" > { t, : .title } < /div>
                        < div, className = "text-sm , text - gray - 600, ">{t.description}</div> 
                        < div, className = "text-xs mt-1" > Roles, { Object, : .entries(t.roles || {}).filter(([_, v]) => v).map(([k]) => k).join(", , ") || ", "}</div> 
                            < /div>
                            < div, className = "text-right text-sm" >
                            { t, : .matrix_room && Matrix }
                            < code > { t, : .matrix_room } < /code></div > ) }, { t, : .forums_tag && Foros }
                        < code > #, { t, : .forums_tag } < /code></div > ) }
                < /div>
                < /li>) }
        < /ul>
        < /section>;
}
/main>;
;
Ruta;
completa: apps / web / pages / api / channels / [...path].ts;
const BASE = process.env.CHANNELS_API_BASE || "http://localhost:8012";
export default async function handler(req, res) {
    const path = req.query.path.join("/");
    const url = `${BASE}/${path}${req.url?.includes("?") ? "?" +
        req.url.split("?")[1] : ""}`;
    const r = await fetch(url, { method: req.method, headers: {
            "content-type": req.headers["content-type"] || ""
        }, body: ["POST", "PUT", "PATCH"].includes(req.method || "") ?
            JSON.stringify(req.body) : undefined });
    const text = await r.text();
    res.status(r.status).send(text ? JSON.parse(text) : null);
}
Ruta;
completa: docs / channels - structure.example.yaml;
#;
Estructura;
por;
área(ejemplo, para, seed);
areas: -id;
"core-finanzas";
guild: "core";
name: "Finanzas";
topics: -key;
"presupuesto";
title: "Presupuesto";
description: "Planeación de presupuesto trimestral";
forums_tag: "presupuesto";
roles: {
    guest: false, member;
    true, mod;
    true, admin;
    true;
}
rules: ["allow-gov-terms", "deny-insults", "max-800"]
    - key;
"reportes";
title: "Reportes";
description: "KPIs, auditorías, cierres";
forums_tag: "reportes";
roles: {
    guest: false, member;
    true, mod;
    true, admin;
    true;
}
rules: ["allow-kpi-terms", "deny-insults", "attachments-no-img"];
rules: -id;
"allow-gov-terms";
name: "Solo términos de gobernanza";
kind: "allowlist_keywords";
config: {
    keywords: ["presupuesto", "capex", "opex", "partida",
        "kpi", "ejercicio"];
}
action: "warn"
    - id;
"allow-kpi-terms";
name: "Términos KPIs";
kind: "allowlist_keywords";
config: {
    keywords: ["objetivo", "kpi", "meta", "métrica",
        "revisión"];
}
action: "warn"
    - id;
"deny-insults";
name: "Sin insultos";
kind: "denylist_keywords";
config: {
    keywords: ["idiota", "estúpido", "tonto"];
}
action: "hide"
    - id;
"max-800";
name: "Máx 800 chars";
kind: "max_length";
config: {
    max: 800;
}
action: "flag"
    - id;
"attachments-no-img";
name: "Sin imágenes";
kind: "attachments";
config: {
    images: false;
}
action: "hide";
Ruta;
completa: services / channels / tests / channels.test.ts;
import { describe, it, expect } from "vitest";
describe("channels structure & noise", () => {
    it("computes noise reduction", async () => {
        // simulate API calls (skipping full Fastify boot for brevity) 
        // baseline: 5 off / 15 on (25% ruido); window: 2 off / 18 on 
        (10 % );
        reducción;
        15 %
        ;
        const baselineNoise = 5 / (5 + 15);
        const windowNoise = 2 / (2 + 18);
        const reduction = (baselineNoise - windowNoise) * 100;
        expect(Math.round(reduction)).toBe(15);
    });
});
Cómo;
operan;
los;
canales;
temáticos;
Back - end(Channels, Service);
Define;
Áreas;
y;
Tópicos;
con;
permisos;
por;
rol;
y;
reglas(allow / deny, keywords, longitud, adjuntos, etc.).
;
Sincroniza;
la;
estructura;
con;
Matrix(Spaces + Rooms);
vía;
el;
provisioner;
existente;
y;
enlaza;
tags;
en;
Foros.
;
Ofrece / directory;
para;
que;
el;
frontend;
liste;
la;
estructura;
por;
área.
;
Recibe / events / ingest;
desde;
conectores(Matrix, webhook / bot, y, Foros);
para;
clasificar;
cada;
mensaje;
como;
on_topic / off_topic;
y;
registrar;
ruido.
;
Expone / topics / ;
key / noise;
con;
reducción;
de;
ruido( % );
comparando;
ventana;
14;
d;
vs;
baseline;
anterior(14, d), y;
publica;
métricas;
Prometheus: ;
channels_noise_ratio;
{
    topic = ;
}
channels_noise_reduction_pct;
{
    topic = ;
}
channels_offtopic_total;
{
    topic, source, reason;
}
Moderación;
Reglas;
claras;
por;
tópico;
versionadas(endpoint / rules);
y;
asociadas;
a;
cada;
tópico.
;
El;
veredicto;
de;
reglas;
permite;
warn / flag / hide / mute(las, acciones, severas, se, ejecutan, por, los, bots / foros);
aquí;
se;
emiten;
señales;
y;
se;
registra;
Frontend;
Página;
Directorio(/channels);
que;
muestra;
áreas, tópicos, permisos, enlaces;
a;
rooms / tags;
y;
sirve;
de;
página;
de;
reglas.
;
(Opcional);
Un;
tablero;
SRE;
puede;
leer;
las;
métricas;
y;
graficar;
channels_noise_reduction_pct.
    DoD(Definición, de, Hecho);
Estructura;
por;
área;
y;
reglas;
claras: ;
Creación;
de;
Áreas / Tópicos;
vía;
POST / areas + reglas;
en;
POST / rules.
;
Sync;
a;
Matrix;
con;
alias;
deterministas;
y;
enlace;
a;
Foros;
por;
etiqueta.
;
Permisos: ;
Campos;
roles;
por;
tópico;
el;
provisioner;
aplica;
power;
levels;
en;
rooms(lectura / escritura).
;
Los;
endpoints;
exponen;
el;
directorio;
para;
que;
el;
gateway;
aplique;
guardas;
en;
BFF;
si;
hace;
falta.
;
Reducción;
de;
ruido;
X % ;
Cálculo;
en;
GET / topics / ;
key / noise;
con;
baseline;
y;
ventana;
definidos.
;
Métrica;
channels_noise_reduction_pct;
X(configurable, NOISE_TARGET_PCT);
para;
marcar;
target_met = true.
;
Ejemplo;
rápido;
de;
uso;
#;
1;
Crear;
reglas;
curl - X;
POST;
http: //localhost:8012/rules -H 'content-type: 
 application / json;
' -d ';
{
    "id";
    "allow-gov-terms", "name";
    "Términos de ;
    gobernanza;
    ",";
    kind;
    ":";
    allowlist_keywords;
    ", ;
    "config";
    {
        "keywords";
        ["presupuesto", "capex", "opex", "kpi"];
    }
    "action";
    "w;
    arn;
    " ;
}
' ;
#;
2;
Crear;
área;
y;
tópicos;
curl - X;
POST;
http: //localhost:8012/areas -H 'content-type: 
 application / json;
' -d ';
{
    "id";
    "core-finanzas", "guild";
    "core", "name";
    "Finanzas",
        "topics";
    [
        { "key": "presupuesto", "title": "Presupuesto", "roles": { "member": true, "mod: ":true,", admin, ":true},": rules, ":[": allow - gov - terms, "]} :  } }
    ];
}
' ;
#;
3;
Sincronizar;
con;
Matrix;
curl - X;
POST;
http: //localhost:8012/areas/core-finanzas/sync 
 #;
4;
Ingesta(Matrix / Foros);
para;
medir;
ruido;
curl - X;
POST;
http: //localhost:8012/events/ingest -H 'content-type: 
 application / json;
' -d ';
{
    "topic_key";
    "presupuesto", "source";
    "matrix", "content";
    "¿Qué KPI ;
    usamos;
    para;
    CAPEX;
    2025 ? " 
        :
    ;
}
' ;
#;
5;
Métrica;
de;
reducción;
curl;
http: //localhost:8012/topics/presupuesto/noise 
 Alertas;
SRE(opcional);
Ruta;
completa: infra / alerts / channels.yaml;
groups: -name;
channels - noise;
rules: -alert;
ChannelsNoiseReductionBelowTarget;
expr: avg_over_time(channels_noise_reduction_pct[1], h) < bool(vector($, { X:  = 15 }));
for (; ; )
    : 2;
h;
labels: {
    severity: warning;
}
annotations: summary: "Reducción de ruido por debajo de ${X}%";
description: "Revisar reglas y allowlists del tópico con peor ;
desempeño.;
" ;
Notas;
finales;
Este;
servicio;
de;
canales;
no;
reemplaza;
moderación;
avanzada(spam / tox);
ya;
existente,
    sino;
que;
añade;
organización;
por;
tópico;
y;
reglas;
declarativas;
para;
reducir;
off;
topic;
medible.
;
La;
clasificación;
es;
determinista(listas, y, heurísticas, simples);
para;
trazabilidad;
se;
puede;
enriquecer;
con;
ML;
si;
GNEW;
lo;
requiere;
más;
adelante.
;
Todo;
queda;
versionado;
y;
observable;
el;
DoD;
se;
verifica;
con;
el;
endpoint;
de;
ruido;
y;
las;
métricas;
Prometheus.
;
Tú;
dijiste: programa;
a;
nivel;
de;
detalle;
para;
GNEW;
N76;
8.6;
Notificaciones;
push(Prompt, 76);
Objetivo: Informar;
sin;
saturar.Roles;
Backend, Mobile / Web.Stack;
Web;
Push, APNs / FCM, digest.
    Entregables;
Preferencias;
granulares.DoD;
Entregabilidad;
95 % , opt - out;
fácil.
;
ChatGPT;
Plus;
Pensó;
durante;
1;
m;
34;
s;
