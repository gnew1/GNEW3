
export const cfg = {
  port: Number(process.env.PORT ?? 8102),
  dbUrl: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/gnew",
  provider: (process.env.EMBEDDINGS_PROVIDER ?? "local") as "local" | "openai",
  vectorDim: Number(process.env.VECTOR_DIM ?? ((process.env.EMBEDDINGS_PROVIDER === "openai") ? 1536 : 384)),
  openaiKey: process.env.OPENAI_API_KEY || null
} as const;


