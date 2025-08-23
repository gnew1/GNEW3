
import express from "express";
import helmet from "helmet";
import { auditLogger } from "./middleware/auditLogger";
import { apiRateLimiter } from "./middleware/rateLimiter";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(apiRateLimiter);
app.use(auditLogger);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 4005;
app.listen(port, () => {
  console.log(`Security service running on port ${port}`);
});


/prisma/schema.prisma (fragmento relevante)

model AuditLog {
  id           Int      @id @default(autoincrement())
  method       String
  path         String
  statusCode   Int
  ip           String
  userId       Int?
  userAgent    String
  responseTime Int
  createdAt    DateTime @default(now())
}

Prompt N264 — Servicio de seguridad y auditoría

Stack: Node.js + Express + TypeScript + Prisma + Helmet + Rate Limit.

Objetivo:

Middleware de auditoría que registra cada petición (método, ruta, estado, usuario, IP, User-Agent, tiempo de respuesta).

Middleware de rate limit (100 req/min por IP).

Uso de helmet para cabeceras de seguridad.

Endpoint /health para verificar servicio.

👉 Este microservicio forma parte del stack de seguridad de la DAO GNEW, enfocado en trazabilidad y protección contra abusos.

