import { describe, it, expect, vi } from "vitest";
import { ReviewsClient, ReviewPayload } from "../src/clients/reviews";

describe("ReviewsClient", () => {
  it("submits review using injected fetch and headers", async () => {
    const mockFetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    const client = new ReviewsClient("https://api.test", "secret", mockFetch as any);
    const payload: ReviewPayload = { slug: "proj", address: "0x1", rating: 5, content: "Great" };
    await client.submitReview(payload);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/reviews/submit",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret" }),
        body: JSON.stringify(payload),
      })
    );
  });
});
