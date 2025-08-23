
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/project-tracking... && pnpm --filter @gnew/project-tracking build
EXPOSE 9200
CMD ["node","apps/project-tracking/dist/server.js"]


Progreso actualizado: N412 completado (Project Tracking backend, tests, CI/CD, Docker).
Próxima iteración programada: N413.

