
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();


/prisma/schema.prisma (fragmento nuevo)

model EngagementMetric {
  id        String   @id @default(uuid())
  userId    String
  likes     Int      @default(0)
  comments  Int      @default(0)
  shares    Int      @default(0)
  createdAt DateTime @default(now())
}

Prompt N321 — Servicio de Métricas de Engagement

Stack: Node.js + Express + TypeScript + Prisma.

Endpoints:

POST /engagement → registrar interacción (likes, comments, shares).

GET /engagement/:userId → obtener métricas agregadas y últimas 50 interacciones.

Health check en /health.

👉 Este servicio permite a la DAO GNEW medir la participación de los usuarios en proyectos y comunidades, alimentando dashboards y algoritmos de reputación.

