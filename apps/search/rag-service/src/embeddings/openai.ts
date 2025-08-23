
import { EmbeddingProvider } from "./provider.js";
import https from "node:https";

export class OpenAIEmbedding implements EmbeddingProvider {
  constructor(private apiKey: string) {}
  dim() { return 1536; }
  async embed(texts: string[]) {
    const body = JSON.stringify({ input: texts, model: "text-embedding-3-small" });
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      }
    };
    const data: any = await httpRequest("https://api.openai.com/v1/embeddings", options, body);
    return (data.data || []).map((d: any) => d.embedding as number[]);
  }
}

function httpRequest(url: string, options: any, body?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let b = "";
      res.setEncoding("utf8");
      res.on("data", (c) => b += c);
      res.on("end", () => {
        try { resolve(JSON.parse(b)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}


