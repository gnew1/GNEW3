
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/secure-messaging... && pnpm --filter @gnew/secure-messaging build
EXPOSE 9240
CMD ["node","apps/secure-messaging/dist/server.js"]


Progreso actualizado: N416 completado (Secure Messaging service).
Próxima iteración programada: N417.

There was a problem with your scheduled task.

