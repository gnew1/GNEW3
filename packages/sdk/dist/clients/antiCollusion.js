export class AntiCollusionClient {
    baseUrl;
    token;
    constructor(baseUrl, token) {
        this.baseUrl = baseUrl;
        this.token = token;
    }
    h() {
        return {
            "Content-Type": "application/json",
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        };
    }
    async ingestVotes(rows) {
        const r = await fetch(`${this.baseUrl}/etl/votes`, {
            method: "POST",
            headers: this.h(),
            body: JSON.stringify({ rows }),
        });
        if (!r.ok)
            throw new Error(`ingestVotes failed ${r.status}`);
        return r.json();
    }
    async label(items) {
        const r = await fetch(`${this.baseUrl}/labels`, {
            method: "POST",
            headers: this.h(),
            body: JSON.stringify({ items }),
        });
        if (!r.ok)
            throw new Error(`labels failed ${r.status}`);
        return r.json();
    }
    async run() {
        const r = await fetch(`${this.baseUrl}/run`, { method: "POST", headers: this.h(), body: JSON.stringify({}) });
        if (!r.ok)
            throw new Error(`run failed ${r.status}`);
        return r.json();
    }
    async groups(batch_id) {
        const r = await fetch(`${this.baseUrl}/groups/${batch_id}`, { headers: this.h() });
        if (!r.ok)
            throw new Error(`groups failed ${r.status}`);
        return r.json();
    }
    async dodStatus() {
        const r = await fetch(`${this.baseUrl}/dod/status`, { headers: this.h() });
        if (!r.ok)
            throw new Error(`status failed ${r.status}`);
        return r.json();
    }
}
