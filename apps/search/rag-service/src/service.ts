
import { cfg } from "./config.js";
import { LocalEmbedding } from "./embeddings/local.js";
import { OpenAIEmbedding } from "./embeddings/openai.js";
import type { EmbeddingProvider } from "./embeddings/provider.js";

let provider: EmbeddingProvider;

export function getProvider(): EmbeddingProvider {
  if (!provider) {
    if (cfg.provider === "openai") {
      if (!cfg.openaiKey) throw new Error("OPENAI_API_KEY required for openai embeddings");
      provider = new OpenAIEmbedding(cfg.openaiKey);
    } else {
      provider = new LocalEmbedding();
    }
    if (provider.dim() !== cfg.vectorDim) {
      console.warn(`[rag-service] VECTOR_DIM=${cfg.vectorDim} difiere de provider.dim=${provider.dim()} — usa VECTOR_DIM=${provider.dim()} para pgvector`);
    }
  }
  return provider;
}


