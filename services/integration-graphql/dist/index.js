import { ApolloServer } from "@apollo/server";
import express from "express";
import cors from "cors";
// use express.json instead of body-parser to avoid extra types
import rateLimit from "express-rate-limit";
import { typeDefs } from "./schema";
import fetch from "node-fetch";
const API_VERSION = process.env.API_VERSION || "v1";
const INTEGRATION_URL = process.env.INTEGRATION_URL ||
    "http://integration:8000";
const PORT = Number(process.env.PORT || 8007);
// Rate limit por API key/JWT/IP (60 req/min) 
const limiter = rateLimit({
    windowMs: Number(process.env.RL_WINDOW_SECONDS || 60) * 1000,
    max: Number(process.env.RL_MAX_REQUESTS || 60),
    keyGenerator: (req) => (req.header("x-api-key") ?? req.header("authorization") ?? req.ip ?? ""),
    standardHeaders: true,
    legacyHeaders: false
});
const server = new ApolloServer({
    typeDefs,
    resolvers: {
        Query: {
            ping: () => true,
            projects: async (_, __, ctx) => {
                const r = await fetch(`${INTEGRATION_URL}/${API_VERSION}/projects`, {
                    headers: ctx.forwardHeaders
                });
                if (r.ok)
                    return r.json();
                return [];
            },
            rewards: async (_, args, ctx) => {
                const r = await fetch(`${INTEGRATION_URL}/${API_VERSION}/rewards/${encodeURIComponent(args.user)}`, {
                    headers: ctx.forwardHeaders
                });
                if (r.ok)
                    return r.json();
                return { user: args.user, rewards: 0 };
            }
        },
        Mutation: {
            stake: async (_, args, ctx) => {
                const r = await fetch(`${INTEGRATION_URL}/${API_VERSION}/defi/stake`, {
                    method: "POST",
                    headers: { "content-type": "application/json",
                        ...ctx.forwardHeaders },
                    body: JSON.stringify({ amount: args.amount })
                });
                if (r.ok) {
                    const data = await r.json();
                    return { status: data.status || "ok", txId: data.upstream?.txId };
                }
                return { status: "queued" };
            }
        }
    }
});
async function start() {
    await server.start();
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(limiter);
    // Salud 
    app.get("/health", (_req, res) => res.json({ status: "ok", gql: true, version: 1 }));
    // Apollo sobre /graphql/v1 
    app.use(`/graphql/${API_VERSION}`, (req, _res, next) => {
        // Encabezados a propagar (auth/rate-limit keys) 
        const fwd = {};
        const apiKey = req.header("x-api-key");
        const auth = req.header("authorization");
        if (apiKey)
            fwd["x-api-key"] = apiKey;
        if (auth)
            fwd["authorization"] = auth;
        // @ts-ignore 
        req.context = { forwardHeaders: fwd };
        next();
    }, 
    // @ts-ignore 
    async (req, res) => {
        const mod = await import("@apollo/server/express4");
        const expressMiddleware = mod.expressMiddleware;
        // @ts-ignore 
        return expressMiddleware(server, {
            context: async () => req.context
        })(req, res);
    });
    app.listen(PORT, () => {
        console.log(`GraphQL ready on 
http://localhost:${PORT}/graphql/${API_VERSION}`);
    });
}
start().catch((e) => {
    console.error(e);
    process.exit(1);
});
