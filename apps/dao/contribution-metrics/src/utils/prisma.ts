
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();


/prisma/schema.prisma (fragmento nuevo)

model Contribution {
  id           Int      @id @default(autoincrement())
  userId       String
  projectId    String
  tokensEarned Float
  createdAt    DateTime @default(now())
}

Prompt N295 — Servicio de Métricas de Contribución

Stack: Node.js + Express + TypeScript + Prisma.

Funcionalidad:

POST /metrics registra una contribución con userId, projectId y tokens obtenidos.

GET /metrics lista métricas filtradas por usuario y proyecto.

Persistencia en BD vía Prisma.

Health check en /health.

👉 Este microservicio permite a la DAO GNEW auditar y visualizar la distribución de tokens por colaboraciones.

