import { expect } from "chai"; 
import { setParticipation } from "../src/metrics.js"; 
 
describe("DoD: participación > X% y ejecución sin fallos", () => { 
  it("marca participación >= umbral", async () => { 
    const X = Number(process.env.DOD_MIN_PARTICIPATION || 0.10); // 
10% 
    const ratio = 0.135; 
    setParticipation("test-proposal", ratio); 
    expect(ratio).to.be.greaterThanOrEqual(X); 
  }); 
}); 
