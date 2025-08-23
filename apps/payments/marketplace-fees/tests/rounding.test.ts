
import { applyPctPpm } from "../src/money.js";

test("half-up rounding on ppm", () => {
  // 1% of 1 minor unit => 0.01 -> rounds half-up to 0
  expect(applyPctPpm(1, 10000)).toBe(0);
  // 2.5% of 199 -> 4.975 -> 5
  expect(applyPctPpm(199, 25000)).toBe(5);
});


