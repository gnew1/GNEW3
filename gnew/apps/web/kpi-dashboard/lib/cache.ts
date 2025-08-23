import LRU from "lru-cache";

const cache = new LRU<string, any>({
  max: 500, // items
  ttl: 1000 * 60, // default 60s
  allowStale: true,
});

export async function getOrSet<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit as T;
  const data = await loader();
  cache.set(key, data, { ttl: ttlSeconds * 1000 });
  return data;
}

