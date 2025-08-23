
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();


/prisma/schema.prisma (fragmento nuevo)

model Metric {
  id        Int      @id @default(autoincrement())
  service   String
  metric    String
  value     Float
  createdAt DateTime @default(now())
}

Prompt N276 — Servicio de métricas

Stack: Node.js + Express + TypeScript + Prisma.

Objetivo:

Microservicio para recopilar y consultar métricas de distintos servicios de la DAO.

POST /metrics guarda métricas con service, metric, value.

GET /metrics?service=&metric=&limit= devuelve las últimas métricas filtradas.

Persistencia en BD con Prisma.

Health check en /health.

👉 Este servicio permite consolidar información de rendimiento y comportamiento de los microservicios de GNEW.

