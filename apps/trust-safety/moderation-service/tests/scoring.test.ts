
import { computeScores } from "../src/scorer.js";

test("detecta spam básico", () => {
  const t = "Click here to get free money at http://bad.tk now!";
  const { scores } = computeScores(t);
  expect(scores.spam).toBeGreaterThan(0.5);
});

test("pii: email y tarjeta", () => {
  const t = "Mi correo es a@b.com y mi tarjeta 4111 1111 1111 1111";
  const { scores } = computeScores(t, "es");
  expect(scores.pii).toBeGreaterThan(0.5);
});


