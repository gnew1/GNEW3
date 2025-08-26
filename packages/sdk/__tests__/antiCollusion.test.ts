import { describe, it, expect, vi } from "vitest";
import { AntiCollusionClient } from "../src/clients/antiCollusion";

describe("AntiCollusionClient", () => {
  it("uses injected fetch and includes auth header", async () => {
    const mockFetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }));
    const client = new AntiCollusionClient("https://api.test", "token", mockFetch as any);
    await client.run();
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test/run",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
  });
});
