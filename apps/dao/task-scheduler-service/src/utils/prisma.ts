
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();


/prisma/schema.prisma (fragmento nuevo)

model ScheduledTask {
  id        String   @id
  name      String
  cron      String
  payload   String?
  status    String   // scheduled, running, completed, canceled
  createdAt DateTime @default(now())
}

Prompt N305 — Servicio de Planificación de Tareas DAO

Stack: Node.js + Express + TypeScript + Prisma.

Endpoints:

POST /tasks → crear tarea con name, cron, payload.

GET /tasks → listar todas las tareas.

DELETE /tasks/:id → cancelar tarea.

Health check en /health.

👉 Este microservicio gestiona la planificación y control de tareas recurrentes dentro de la DAO GNEW, garantizando que procesos automatizados sigan sus cronogramas.

