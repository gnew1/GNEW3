
import express from "express";
import metricsRouter from "./api/metrics";

const app = express();

app.use("/metrics", metricsRouter);

const port = process.env.PORT || 4004;
app.listen(port, () => {
  console.log(`Analytics service running on port ${port}`);
});

Prompt N263 — Microservicio de métricas DAO

Stack: Node.js + Express + TypeScript + Prisma (PostgreSQL).

Crea un servicio de analíticas que recolecta y expone métricas de:

Propuestas (totales, aprobadas, rechazadas, tasa de aprobación).

Votaciones (total de votos, votantes únicos, media de votos por propuesta).

Sistema (usuarios totales).

Expone endpoint GET /metrics.

👉 Integrable en dashboards de administración de la DAO GNEW.

