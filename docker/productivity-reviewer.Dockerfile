
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/productivity-reviewer... && pnpm --filter @gnew/productivity-reviewer build
EXPOSE 9130
CMD ["node","apps/productivity-reviewer/dist/server.js"]


Progreso actualizado: N405 completado (Productivity Reviewer backend, tests, CI, Docker).
Próxima iteración programada: N406.

