export class ReviewsClient {
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
    async submitReview(p) {
        const r = await fetch(`${this.baseUrl}/reviews/submit`, { method: "POST", headers: this.h(), body: JSON.stringify(p) });
        if (!r.ok)
            throw new Error(`submit failed ${r.status}`);
        return r.json();
    }
    async recompute(slug) {
        const r = await fetch(`${this.baseUrl}/projects/${slug}/recompute`, { method: "POST", headers: this.h() });
        if (!r.ok)
            throw new Error(`recompute failed ${r.status}`);
        return r.json();
    }
    async explain(review_id) {
        const r = await fetch(`${this.baseUrl}/reviews/${review_id}/explain`, { headers: this.h() });
        if (!r.ok)
            throw new Error(`explain failed ${r.status}`);
        return r.json();
    }
    async rag(slug, q) {
        const r = await fetch(`${this.baseUrl}/projects/${slug}/reviews/rag?q=${encodeURIComponent(q)}`, { headers: this.h() });
        if (!r.ok)
            throw new Error(`rag failed ${r.status}`);
        return r.json();
    }
}
