
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/reward-distribution... && pnpm --filter @gnew/reward-distribution build
EXPOSE 9150
CMD ["node","apps/reward-distribution/dist/server.js"]


Progreso actualizado: N407 completado (Reward Distribution backend, tests, CI, Docker).
Próxima iteración programada: N408.

