
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/project-evaluation... && pnpm --filter @gnew/project-evaluation build
EXPOSE 9210
CMD ["node","apps/project-evaluation/dist/server.js"]


Progreso actualizado: N413 completado (Project Evaluation backend, tests, CI/CD, Docker).
Próxima iteración programada: N414.

