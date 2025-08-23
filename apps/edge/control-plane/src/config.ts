
export const cfg = {
  port: Number(process.env.PORT ?? 8096),
  dbUrl: process.env.DATABASE_URL ?? "data/edge_control_plane.db",
  apiKey: process.env.CP_API_KEY ?? "change-me",
  edgeBaseUrl: process.env.EDGE_BASE_URL ?? "http://127.0.0.1:8787",
  edgeAdminToken: process.env.EDGE_ADMIN_TOKEN ?? "change-me"
} as const;


