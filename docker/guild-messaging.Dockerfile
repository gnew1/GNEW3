
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/guild-messaging... && pnpm --filter @gnew/guild-messaging build
EXPOSE 9160
CMD ["node","apps/guild-messaging/dist/server.js"]


Progreso actualizado: N408 completado (Guild Messaging backend con WebSocket, REST API, tests, CI/CD, Docker).
Próxima iteración programada: N409.

