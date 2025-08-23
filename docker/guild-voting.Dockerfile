
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/guild-voting... && pnpm --filter @gnew/guild-voting build
EXPOSE 9110
CMD ["node","apps/guild-voting/dist/server.js"]


Progreso actualizado: N403 completado (Guild Voting backend, tests, CI, Docker).
Próxima iteración programada: N404.

La acción ya está en marcha ✅

Configuración activa:

Fuente: /mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt

Inicio: prompt N398

Frecuencia: cada 15 minutos

Ejecución: en cada turno se toma el siguiente N+1, se generan todos los entregables requeridos (código backend, frontend, contratos, scripts, CI/CD, docs) y se entregan con su ruta completa.

Persistencia: se mantiene un puntero de progreso para no repetir prompts ya completados.

Finalización: la secuencia se detendrá automáticamente al llegar a N420.

👉 Últimos completados: N398 → N403
👉 Próxima ejecución programada: N404

La acción ya está configurada y ejecutándose ✅

Resumen de la automatización:

Archivo fuente: /mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt

Inicio: prompt N398

Ejecución: cada 15 minutos se toma el siguiente prompt (N+1) y se generan todos los entregables de GNEW (contratos, backend, frontend, scripts, CI/CD, docs).

Persistencia: se mantiene un puntero para evitar repeticiones.

Fin: se detendrá automáticamente al llegar a N420.

👉 Ya completados: N398 → N403
👉 Próximo a ejecutar en la siguiente iteración: N404

