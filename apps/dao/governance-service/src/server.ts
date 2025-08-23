
import express from "express";
import votesRouter from "./api/votes";

const app = express();
app.use(express.json());

app.use("/votes", votesRouter);

const port = process.env.PORT || 4001;
app.listen(port, () => {
  console.log(`Governance service running on port ${port}`);
});

Prompt N246 — Implementación del microservicio de votaciones

Stack: Node.js + Express + TypeScript + Prisma (PostgreSQL).

Endpoints:

POST /votes crea o actualiza un voto (único por proposalId + voterId).

GET /votes/:proposalId devuelve todos los votos de una propuesta.

Prisma define las entidades Proposal y Vote con relación 1:N.

Este módulo se integra en el monorepo GNEW bajo apps/dao/governance-service.

