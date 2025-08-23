
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();


/prisma/schema.prisma (fragmento nuevo)

model Alert {
  id        Int      @id @default(autoincrement())
  type      String
  target    String
  message   String
  createdAt DateTime @default(now())
}

Prompt N282 — Servicio de Alertas

Stack: Node.js + Express + TypeScript + Prisma.

Funcionalidad:

POST /alerts permite crear alertas para usuarios vía email, sms o push.

GET /alerts lista alertas filtradas por tipo y límite.

Persistencia en BD con Prisma.

Health check en /health.

👉 Este microservicio centraliza la gestión y envío de alertas dentro de la DAO GNEW.

