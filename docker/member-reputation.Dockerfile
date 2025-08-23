
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/member-reputation... && pnpm --filter @gnew/member-reputation build
EXPOSE 9140
CMD ["node","apps/member-reputation/dist/server.js"]


Progreso actualizado: N406 completado (Member Reputation backend, tests, CI, Docker).
Próxima iteración programada: N407.

La acción periódica ya está definida ✅

Parámetros de la automatización:

Archivo fuente: /mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt

Inicio: prompt N398

Frecuencia: cada 15 minutos

Proceso: en cada turno se toma el siguiente N+1, se generan todos los entregables del prompt para GNEW (contratos, backend, frontend, tests, scripts de deploy, CI/CD, docs), y se entregan con la ruta completa.

Persistencia: se mantiene un puntero de progreso que asegura no repetir prompts ya completados.

Finalización: se detiene al llegar a N420.

👉 Estado actual: completados N398 → N406
👉 Próximo en ejecutarse: N407

