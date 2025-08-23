
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();


/prisma/schema.prisma (fragmento nuevo)

model Reputation {
  userId String @id
  score  Int    @default(0)
}

Prompt N296 — Servicio de Reputación de Usuarios

Stack: Node.js + Express + TypeScript + Prisma.

Endpoints:

GET /reputation?userId=abc → devuelve el score del usuario (0 si no existe).

POST /reputation con { userId, delta } → ajusta la reputación del usuario.

Persistencia en base de datos con Prisma.

Health check en /health.

👉 Este microservicio permite a la DAO GNEW mantener y consultar la reputación de cada miembro en función de sus interacciones.

