
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();


/prisma/schema.prisma (fragmento nuevo)

model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int
  message   String
  type      String   @default("INFO")
  createdAt DateTime @default(now())
}

Prompt N270 — Servicio de notificaciones internas

Stack: Node.js + Express + TypeScript + Prisma.

Objetivo:

Servicio que gestione notificaciones internas de la DAO.

Endpoint POST /notifications para crear una notificación.

Endpoint GET /notifications?userId=x para listar notificaciones de un usuario.

Registro en base de datos con userId, message, type y createdAt.

Health check en /health.

👉 Este microservicio permitirá que otros módulos de GNEW envíen y consulten notificaciones internas de usuarios.

