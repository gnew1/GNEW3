
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/resource-allocation... && pnpm --filter @gnew/resource-allocation build
EXPOSE 9190
CMD ["node","apps/resource-allocation/dist/server.js"]


Progreso actualizado: N411 completado (Resource Allocation backend, tests, CI/CD, Docker).
Próxima iteración programada: N412.

