export type GnewOptions = { baseUrl: string };
export class Gnew {
  constructor(private readonly opts: GnewOptions) {}
  async health(): Promise<{ status: "ok" }> {
    const r = await fetch(new URL("/health", this.opts.baseUrl));
    return r.json();
  }
  async echo(msg: string): Promise<{ echo: string }> {
    const r = await fetch(new URL("/echo", this.opts.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ msg })
    });
    return r.json();
  }
}
export default Gnew;

// Clients
export { AntiCollusionClient } from "./clients/antiCollusion.js";
export { ReviewsClient, type ReviewPayload } from "./clients/reviews.js";

// Governance helpers (ABI-agnostic)
export { type GnewGovToken, getGnewGovToken, getGnewGovTokenDefault } from "./gov.js";
export { type Delegation, scopes as DelegationScopes, getDelegation, getDelegationDefault } from "./delegation.js";


