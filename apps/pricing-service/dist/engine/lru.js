export class LRU {
    max;
    ttlMs;
    map = new Map();
    constructor(max = 5000, ttlMs = 60_000) {
        this.max = max;
        this.ttlMs = ttlMs;
    }
    get(key) {
        const hit = this.map.get(key);
        if (!hit)
            return undefined;
        if (Date.now() - hit.t > this.ttlMs) {
            this.map.delete(key);
            return undefined;
        }
        this.map.delete(key);
        this.map.set(key, { v: hit.v, t: hit.t });
        return hit.v;
    }
    set(key, val) {
        if (this.map.has(key))
            this.map.delete(key);
        this.map.set(key, { v: val, t: Date.now() });
        if (this.map.size > this.max) {
            const it = this.map.keys().next();
            if (!it.done) {
                this.map.delete(it.value);
            }
        }
    }
    clear() {
        this.map.clear();
    }
}
