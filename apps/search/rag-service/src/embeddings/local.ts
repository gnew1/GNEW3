
import crypto from "node:crypto";
import { EmbeddingProvider } from "./provider.js";

/** Embeddings locales deterministas, 384-d, estilo hashing bag-of-words */
export class LocalEmbedding implements EmbeddingProvider {
  private D = 384;
  dim() { return this.D; }
  async embed(texts: string[]) {
    return texts.map((t) => this.embedOne(t));
  }
  private embedOne(text: string): number[] {
    const v = new Float32Array(this.D);
    const tokens = (text.toLowerCase().normalize("NFKC").match(/[a-záéíóúñ0-9]+/gi) || []).slice(0, 2048);
    for (const tok of tokens) {
      const h = this.hash(tok);
      const idx = h % this.D;
      v[idx] += 1;
    }
    // l2 normalize
    let norm = 0;
    for (let i = 0; i < this.D; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < this.D; i++) v[i] /= norm;
    return Array.from(v) as number[];
  }
  private hash(s: string) {
    const h = crypto.createHash("sha256").update(s).digest();
    return h[0] | (h[1] << 8) | (h[2] << 16) | (h[3] << 24) >>> 0;
  }
}


