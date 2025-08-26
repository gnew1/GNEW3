export class Gnew {
    opts;
    constructor(opts) {
        this.opts = opts;
    }
    async health() {
        const r = await fetch(new URL("/health", this.opts.baseUrl));
        return r.json();
    }
    async echo(msg) {
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
export { ReviewsClient } from "./clients/reviews.js";
// Governance helpers (ABI-agnostic)
export { getGnewGovToken, getGnewGovTokenDefault } from "./gov.js";
export { scopes as DelegationScopes, getDelegation, getDelegationDefault } from "./delegation.js";
