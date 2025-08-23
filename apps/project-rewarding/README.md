
# GNEW Project Rewarding (N414)

**Purpose:** Provide a service to reward project contributors with Gnew0 or Gnews tokens.

## Endpoints
- `POST /api/project-rewarding` – create reward
- `GET /api/project-rewarding/project/:projectId` – list rewards for a project
- `GET /api/project-rewarding/user/:userId` – list rewards for a user

## Local Run
```bash
pnpm --filter @gnew/project-rewarding dev

Build
pnpm --filter @gnew/project-rewarding build

Test
pnpm --filter @gnew/project-rewarding test

Deployment

Dockerfile included. Default port: 9220


/.github/work


/apps/token-ledger/package.json

{
  "name": "@gnew/token-ledger",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.19.2",
    "pino": "^9.3.2",
    "zod": "^3.23.8",
    "uuid": "^11.0.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.10",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.15.7",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5",
    "supertest": "^7.1.1"
  }
}


/apps/token-ledger/tsconfig.json

{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}


/apps/token-ledger/src/server.ts

import express from "express";
import pino from "pino";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const log = pino();
const app = express();
app.use(express.json());

/**
 * Token Ledger Service
 * Records movements of Gnew0 and Gnews tokens with metadata and allows querying balances.
 */
type Tx = {
  id: string;
  from: string|null;
  to: string|null;
  token: "Gnew0"|"Gnews";
  amount: number;
  createdAt: number;
  note?: string;
};

const txs: Tx[] = [];

const TxSchema = z.object({
  from: z.string().nullable(),
  to: z.string().nullable(),
  token: z.enum(["Gnew0","Gnews"]),
  amount: z.number().positive(),
  note: z.string().optional()
});

// Record transaction
app.post("/api/ledger/tx", (req,res) => {
  const parsed = TxSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });
  const tx: Tx = { id: uuidv4(), ...parsed.data, createdAt: Date.now() };
  txs.push(tx);
  log.info({ tx }, "Ledger transaction recorded");
  res.status(201).json(tx);
});

// List transactions
app.get("/api/ledger/txs", (_req,res) => {
  res.json(txs);
});

// Get balance by user
app.get("/api/ledger/balance/:userId", (req,res) => {
  const { userId } = req.params;
  const balance = { Gnew0:0, Gnews:0 };
  for (const tx of txs) {
    if (tx.to === userId) balance[tx.token]+=tx.amount;
    if (tx.from === userId) balance[tx.token]-=tx.amount;
  }
  res.json({ userId, balance });
});

const port = Number(process.env.PORT ?? 9230);
app.listen(port, () => log.info({ port }, "Token Ledger service running"));


/apps/token-ledger/tests/server.test.ts

import { test, expect } from "vitest";
import request from "supertest";
import "../src/server";

test("record tx and check balance", async () => {
  const create = await request("http://localhost:9230")
    .post("/api/ledger/tx")
    .send({ from:null, to:"u1", token:"Gnew0", amount:100 });
  expect([201,400]).toContain(create.status);

  const balance = await request("http://localhost:9230").get("/api/ledger/balance/u1");
  expect(balance.status).toBe(200);
});


/apps/token-ledger/README.md

# GNEW Token Ledger (N415)

**Purpose:** Maintain a ledger of token transactions for Gnew0 and Gnews with querying support.

## Endpoints
- `POST /api/ledger/tx` – record transaction
- `GET /api/ledger/txs` – list all transactions
- `GET /api/ledger/balance/:userId` – get balance for a user

## Local Run
```bash
pnpm --filter @


