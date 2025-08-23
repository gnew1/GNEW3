
import { splitKEK, combineKEK } from "../src/sss.js";

describe("Shamir SSS t-of-n", () => {
  test("reconstructs with threshold and fails below", () => {
    const key = "a".repeat(64); // hex 32 bytes
    const shares = splitKEK(key, 5, 3);
    const rec = combineKEK([shares[0], shares[2], shares[4]]);
    expect(rec).toBe(key);
    // Below threshold should reconstruct wrong key
    const rec2 = combineKEK([shares[0], shares[1]]);
    expect(rec2).not.toBe(key);
  });
});


