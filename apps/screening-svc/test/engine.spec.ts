import { screen } from "../src/services/engine";
import { prisma } from "../src/infra/prisma";

describe("screening engine", () => {
  beforeAll(async () => {
    await prisma.watchlistItem.createMany({
      data: [
        {
          sourceKey: "ofac_sdn",
          kind: "person",
          name: "Juan Perez Garcia",
          aliases: ["J. P. Garcia"],
          raw: {}
        },
        {
          sourceKey: "ofac_wallets",
          kind: "wallet",
          name: "Wallet Sanctioned",
          wallet: "0xabc123",
          raw: {}
        }
      ]
    });
  });

  it("flags strong name match as review/blocked", async () => {
    const run = await screen({
      subjectId: "subj1",
      name: "Juan P. Garcia",
      country: "ES"
    });
    expect(["review", "blocked"]).toContain(run.decision);
  });

  it("blocks exact wallet match", async () => {
    const run = await screen({
      subjectId: "subj2",
      wallets: ["0xAbC123"]
    });
    expect(run.decision).toBe("blocked");
  });

  afterAll(async () => {
    await prisma.watchlistItem.deleteMany({
      where: { sourceKey: { in: ["ofac_sdn", "ofac_wallets"] } }
    });
    await prisma.$disconnect();
  });
});