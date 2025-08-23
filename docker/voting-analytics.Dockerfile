
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/voting-analytics... && pnpm --filter @gnew/voting-analytics build
EXPOSE 9170
CMD ["node","apps/voting-analytics/dist/server.js"]


Progreso actualizado: N409 completado (Voting Analytics backend, tests, CI/CD, Docker).
Próxima iteración programada: N410.

