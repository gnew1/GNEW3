
# Checkout Demo (N155)

App React mínima que usa `@gnew/checkout-react` contra:
- `@gnew/fiat-onofframp` en `http://localhost:8081`
- (Opcional) `@gnew/subscriptions-api` en `http://localhost:8082`

## Ejecutar
```bash
pnpm -C apps/checkout-demo dev


/apps/checkout-demo/package.json
```json
{
  "name": "@gnew/checkout-demo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 5173"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@gnew/checkout-react": "workspace:*"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4"
  }
}


