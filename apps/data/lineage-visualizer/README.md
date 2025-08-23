
# Lineage Visualizer (N176)

> **Prompt N176** — Frontend de visualización de lineage. Permite renderizar grafos de datasets (nodos) y jobs (edges) del servicio **lineage-tracker (N175)**.  
> **Stack**: React 18, TypeScript, Vite, TailwindCSS, d3-force, shadcn/ui.  
> **Monorepo**: `apps/data/lineage-visualizer`.

## Features
- Conexión a `lineage-tracker` API para traer lineage upstream/downstream.
- Grafo interactivo con zoom/pan, resaltando dataset seleccionado.
- Panel lateral con detalles del dataset (nombre, db.table/location, calidad).
- Tooltip en aristas mostrando job y transform aplicada.
- Responsive, dark mode friendly.

## Scripts
```bash
pnpm dev
pnpm build
pnpm preview


/apps/data/lineage-visualizer/package.json
```json
{
  "name": "@gnew/lineage-visualizer",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "d3": "^7.9.0",
    "lucide-react": "^0.452.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "shadcn-ui": "latest"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.4",
    "vite": "^5.4.2"
  }
}


