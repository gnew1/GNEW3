export type ReviewPayload = {
  slug: string;
  address: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  content: string;
  proof?: string[];
  weight_bps?: number;
};

export class ReviewsClient {
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

  async submitReview(p: ReviewPayload): Promise<unknown> {
    const r = await this.fetchFn(`${this.baseUrl}/reviews/submit`, { method: "POST", headers: this.h(), body: JSON.stringify(p) });
    if (!r.ok) throw new Error(`submit failed ${r.status}`);
    return r.json();
  }

  async recompute(slug: string): Promise<unknown> {
    const r = await this.fetchFn(`${this.baseUrl}/projects/${slug}/recompute`, { method: "POST", headers: this.h() });
    if (!r.ok) throw new Error(`recompute failed ${r.status}`);
    return r.json();
  }

  async explain(review_id: number): Promise<unknown> {
    const r = await this.fetchFn(`${this.baseUrl}/reviews/${review_id}/explain`, { headers: this.h() });
    if (!r.ok) throw new Error(`explain failed ${r.status}`);
    return r.json();
  }

  async rag(slug: string, q: string): Promise<unknown> {
    const r = await this.fetchFn(`${this.baseUrl}/projects/${slug}/reviews/rag?q=${encodeURIComponent(q)}`, { headers: this.h() });
    if (!r.ok) throw new Error(`rag failed ${r.status}`);
    return r.json();
  }
}
