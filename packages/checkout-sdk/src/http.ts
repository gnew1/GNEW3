
export class Http {
  constructor(private readonly baseUrl: string, private readonly timeoutMs = 15000) {}

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      const r = await fetch(url, { method: "GET", signal: ctl.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json() as T;
    } finally { clearTimeout(t); }
  }

  async post<T>(path: string, body?: any, headers: Record<string, string> = {}): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : "{}",
        signal: ctl.signal
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json() as T;
    } finally { clearTimeout(t); }
  }

  static idemKey(prefix = "idem"): string {
    const rnd = Math.random().toString(36).slice(2);
    const t = Date.now().toString(36);
    return `${prefix}-${t}-${rnd}`;
  }
}


