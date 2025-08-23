
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/guild-registry... && pnpm --filter @gnew/guild-registry build
EXPOSE 9100
CMD ["node","apps/guild-registry/dist/server.js"]


Progreso actualizado: N402 completado (Guild Registry backend, tests, CI, Docker).
Próxima iteración programada: N403.

