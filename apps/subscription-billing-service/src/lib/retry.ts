
export async function backOff<T>(fn: () => Promise<T>, cfg: { retries: number; baseMs?: number } = { retries: 3 }) {
  const base = cfg.baseMs ?? 250;
  let lastErr: any;
  for (let i = 0; i <= cfg.retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const wait = base * Math.pow(2, i) + Math.floor(Math.random() * base);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}


