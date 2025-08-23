
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/guild-governance... && pnpm --filter @gnew/guild-governance build
EXPOSE 9150
CMD ["node","apps/guild-governance/dist/server.js"]


Progreso actualizado: N407 completado (Guild Governance backend, tests, CI, Docker).
Próxima iteración programada: N408.

