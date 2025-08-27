import { hashEvent, canonicalJson } from "../src/services/consent-core";

describe("hashEvent", () => {
  it("is stable and order-independent for keys", () => {
    const a = { b: 1, a: 2 };
    const b = { a: 2, b: 1 };
    expect(hashEvent(a)).toEqual(hashEvent(b));
  });
  
  it("changes with payload changes", () => {
    const h1 = hashEvent({ x: 1 });
    const h2 = hashEvent({ x: 2 });
    expect(h1).not.toEqual(h2);
  });
});