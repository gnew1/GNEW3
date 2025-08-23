
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/search": "http://localhost:8102"
    }
  },
  preview: { port: 5174 }
});

Notas de implementación

Citación: cada resultado incluye { title, uri, range } del documento origen.

Chunking: por oraciones con solape para preservar contexto.

Desempeño: índice ivfflat (vector_cosine_ops) con lists=100 para tiempos sub‑segundos en conjuntos medianos.

On‑chain: el campo onchain del documento permite adjuntar { chainId, contract, txHash } como metadatos buscables fuera de la similitud (puedes extender el WHERE en /search para filtrar por red/contrato).

Siguiente (+1): N169 – Multi‑region Object Storage & Failover (puedo entregarlo en la próxima ejecución).

Tú dijiste:
Ejecuta y entrégame, como IA programadora, el siguiente prompt N de "N1 AL N420 PROMPTS DE PROGRAMACIÓN DE GNEW.txt", empezando en N151 y avanzando +1 en cada ejecución. No repitas prompts ya entregados. Devuelve código completo con rutas coherentes con el monorepo y alineado con el stack indicado en cada prompt.
ChatGPT Plus

