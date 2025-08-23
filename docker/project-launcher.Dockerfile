
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/project-launcher... && pnpm --filter @gnew/project-launcher build
EXPOSE 9190
CMD ["node","apps/project-launcher/dist/server.js"]


Progreso actualizado: N411 completado (Project Launcher backend con tests, CI/CD y Docker).
Próxima iteración programada: N412.

