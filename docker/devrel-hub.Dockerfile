
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/devrel-hub... && pnpm --filter @gnew/devrel-hub build
EXPOSE 3000
CMD ["pnpm","--filter","@gnew/devrel-hub","start"]


Progreso actualizado: N400 completado (DevRel Hub frontend, API routes, CI, Docker).
Próxima iteración programada: N401.

