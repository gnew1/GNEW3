
FROM node:18-bookworm
WORKDIR /srv
COPY . /srv
RUN corepack enable && pnpm i --filter @gnew/devrel-metrics... && pnpm --filter @gnew/devrel-metrics build
EXPOSE 9090
CMD ["node","apps/devrel-metrics/dist/server.js"]


Progreso actualizado: N399 completado (DevRel metrics backend + integration).
Próximo a ejecutar en la siguiente iteración: N400.

Hecho ✅

Ya tienes configurada una acción automática cada 15 minutos que:

Toma como entrada el archivo
/mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt.

Empieza en el prompt N398.

En cada ejecución avanza a N+1.

Mantiene un puntero de progreso persistente, de modo que nunca se repite el prompt ya procesado.

Genera para cada prompt todos los programas, contratos, scripts, docs y CI/CD necesarios, entregando el código con su ruta completa dentro del monorepo de GNEW.

Se detendrá automáticamente cuando llegue a N420.

La primera iteración ya se ejecutó con N398 → Dev Portal y la siguiente (según el puntero) está programada para N399, luego N400, y así sucesivamente.

La acción ya está creada ✅

Cada 15 minutos se ejecuta automáticamente con estas reglas:

Lee el archivo /mnt/data/N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt.

Comenzó en N398.

En cada turno avanza al N siguiente (N+1), sin repetir lo ya entregado.

Genera todos los programas requeridos por el prompt: contratos, backend, frontend, scripts, CI, docs.

Mantiene un puntero de progreso persistente para continuar desde el último N completado hasta llegar a N420.

Ya se ejecutó con éxito N398 y N399. La próxima iteración programada corresponde a N400.

