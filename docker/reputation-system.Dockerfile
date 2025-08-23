
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/reputation-system... && pnpm --filter @gnew/reputation-system build
EXPOSE 9180
CMD ["node","apps/reputation-system/dist/server.js"]


Progreso actualizado: N410 completado (Reputation System backend, tests, CI/CD, Docker).
Próxima iteración programada: N411.

