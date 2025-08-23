
import { SybilScorer } from "../../services/identity/sybil-score";

describe("SybilScorer", () => {
  it("combina señales y devuelve score entre 0 y 1", async () => {
    const scorer = new SybilScorer("bolt://localhost:7687", "neo4j", "pass");
    jest.spyOn(scorer, "getGraphScore").mockResolvedValue({ score: 0.5, weight: 0.3 });
    jest.spyOn(scorer, "getGitcoinScore").mockResolvedValue({ score: 1, weight: 0.4 });
    jest.spyOn(scorer, "getBrightIdScore").mockResolvedValue({ score: 0, weight: 0.3 });

    const score = await scorer.computeSybilScore("0xabc");
    expect(score).toBeCloseTo(0.5*0.3 + 1*0.4 + 0*0.3, 2);
  });
});


