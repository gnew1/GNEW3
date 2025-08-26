import { LRU } from "../src/engine/lru";

describe("LRU", () => {
  it("evicts least recently used items", () => {
    const cache = new LRU<string, number>(2, 1000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });

  it("expires entries after ttl", () => {
    const realNow = Date.now;
    const cache = new LRU<string, number>(1, 1000);
    Date.now = () => 0;
    cache.set("x", 42);
    Date.now = () => 500;
    expect(cache.get("x")).toBe(42);
    Date.now = () => 1500;
    expect(cache.get("x")).toBeUndefined();
    Date.now = realNow;
  });
});
