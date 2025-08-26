export type LabelItem = { kind: "group" | "user"; key: string | number; y: 0 | 1 };

export class AntiCollusionClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token?: string,
    private readonly fetchFn: typeof fetch = fetch
  ) {}
  private h(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    } as Record<string, string>;
  }

  async ingestVotes(rows: { address: string; target: string; ts: string; value?: number; meta?: any }[]): Promise<unknown> {
    const r = await this.fetchFn(`${this.baseUrl}/etl/votes`, {
      method: "POST",
      headers: this.h(),
      body: JSON.stringify({ rows }),
    });
    if (!r.ok) throw new Error(`ingestVotes failed ${r.status}`);
    return r.json();
  }

  async label(items: LabelItem[]): Promise<unknown> {
    const r = await this.fetchFn(`${this.baseUrl}/labels`, {
      method: "POST",
      headers: this.h(),
      body: JSON.stringify({ items }),
    });
    if (!r.ok) throw new Error(`labels failed ${r.status}`);
    return r.json();
  }

  async run(): Promise<unknown> {
    const r = await this.fetchFn(`${this.baseUrl}/run`, { method: "POST", headers: this.h(), body: JSON.stringify({}) });
    if (!r.ok) throw new Error(`run failed ${r.status}`);
    return r.json();
  }

  async groups(batch_id: string): Promise<unknown> {
    const r = await this.fetchFn(`${this.baseUrl}/groups/${batch_id}`, { headers: this.h() });
    if (!r.ok) throw new Error(`groups failed ${r.status}`);
    return r.json();
  }

  async dodStatus(): Promise<unknown> {
    const r = await this.fetchFn(`${this.baseUrl}/dod/status`, { headers: this.h() });
    if (!r.ok) throw new Error(`status failed ${r.status}`);
    return r.json();
  }
}
