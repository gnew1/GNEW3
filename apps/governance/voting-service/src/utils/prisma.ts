
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();


/prisma/schema.prisma (fragmento nuevo)

model Vote {
  id         String   @id @default(uuid())
  proposalId String
  userId     String
  choice     String
  createdAt  DateTime @default(now())

  @@unique([proposalId, userId])
}

Prompt N322 — Servicio de Votación DAO

Stack: Node.js + Express + TypeScript + Prisma.

Endpoints:

POST /vote → emitir voto para una propuesta (único por usuario).

GET /results/:proposalId → obtener resultados agregados.

Health check en /health.

👉 Este microservicio asegura la integridad del sistema de gobernanza en GNEW, garantizando un voto único por usuario y resultados claros y auditables.

