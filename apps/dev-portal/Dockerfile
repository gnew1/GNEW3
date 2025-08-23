
FROM node:18-bookworm
WORKDIR /app
COPY . /app
RUN corepack enable && pnpm -v
RUN pnpm i && pnpm build
CMD ["pnpm","serve","--","--port","3000","--host","0.0.0.0"]

Cómo pasa el DoD

T2D < 10 min: El script t2d-check.js mide y falla si excede 10 minutos.

Máquina limpia: CI usa runners limpios y crea venv para Python; en JS instala deps desde cero.

Tutoriales reproducibles: Quickstarts minimalistas con salida verificable (health: ok, echo: pong).

Portal navegable: Docusaurus con Quickstarts/SDK/Guías, sin dependencias privadas.

¿Quieres que conecte el Sandbox API real y añada DocSearch/búsqueda semántica interna en el portal, o lo mantenemos mock por ahora para asegurar T2D máximo?

