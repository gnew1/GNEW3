
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/task-assignment... && pnpm --filter @gnew/task-assignment build
EXPOSE 9160
CMD ["node","apps/task-assignment/dist/server.js"]


Progreso actualizado: N408 completado (Task Assignment backend, tests, CI, Docker).
Próxima iteración programada: N409.

