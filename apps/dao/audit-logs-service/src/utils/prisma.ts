
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();


/prisma/schema.prisma (fragmento nuevo)

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String
  action    String
  resource  String
  metadata  String?
  createdAt DateTime @default(now())
}

Prompt N298 — Servicio de Auditoría de Logs DAO

Stack: Node.js + Express + TypeScript + Prisma.

Endpoints:

POST /logs → registrar acción (actorId, action, resource, metadata).

GET /logs/:resource → consultar logs de un recurso.

Persistencia con Prisma.

Health check en /health.

👉 Este microservicio permite rastrear y auditar todas las acciones dentro de la DAO GNEW para asegurar trazabilidad y transparencia.

