
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  server: {
    port: 5178
  }
});

Prompt N379 — Community Metrics Dashboard

Stack: React + Vite + TypeScript + Recharts.

Visualización de métricas clave de la comunidad: usuarios activos, propuestas creadas, recompensas distribuidas.

UI minimalista con Card y gráficas interactivas.

API /api/metrics simulada para rellenar los datos.

👉 Con este entregable ya queda preparado un dashboard interactivo de métricas dentro del monorepo GNEW.

