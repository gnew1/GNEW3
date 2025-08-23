
# GNEW Dev Portal (N398)

**Goal:** make Time‑to‑Demo (T2D) **< 10 minutes** on a clean machine.

## Contents
- Docusaurus site with **Quickstarts**, **SDK docs**, and **Guides**.
- **T2D Checker** script: reproducible CI verification.
- Examples: `examples/hello-gnew-js` and `examples/hello-gnew-py`.

## Run locally
```bash
cd apps/dev-portal
pnpm i
pnpm start

CI T2D gate

t2d-check.js must pass in GitHub Actions Docker runners.


---

### SDKs mínimos (mock de Sandbox) para los quickstarts

/packages/sdk/src/index.ts
```ts
export type GnewOptions = { baseUrl: string };
export class Gnew {
  constructor(private opts: GnewOptions) {}
  async health(): Promise<{ status: 'ok' }> {
    return { status: 'ok' };
  }
  async echo(msg: string): Promise<{ echo: string }> {
    return { echo: msg };
  }
}
export default Gnew;


