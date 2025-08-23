export type ReviewPayload = {
    slug: string;
    address: string;
    rating: 1 | 2 | 3 | 4 | 5;
    title?: string;
    content: string;
    proof?: string[];
    weight_bps?: number;
};
export declare class ReviewsClient {
    private baseUrl;
    private token?;
    constructor(baseUrl: string, token?: string | undefined);
    private h;
    submitReview(p: ReviewPayload): Promise<any>;
    recompute(slug: string): Promise<any>;
    explain(review_id: number): Promise<any>;
    rag(slug: string, q: string): Promise<any>;
}
