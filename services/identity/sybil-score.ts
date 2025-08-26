
/**
 * @file sybil-score.ts
 * @description Implementación del módulo M4: Refuerzo Anti-Sybil con Verificación de Identidad.
 * Integra señales combinadas (actividad, stake, reputación, verificación social)
 * y proveedores externos (Gitcoin Passport, BrightID).
 */

import neo4j, { Driver } from "neo4j-driver";
import axios from "axios";

interface SybilSignal {
  score: number;
  weight: number;
}

export class SybilScorer {
  private readonly driver: Driver;

  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  async getGraphScore(wallet: string): Promise<SybilSignal> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (a:Identity {wallet: $wallet})-[*1..3]-(b:Identity)
         RETURN count(DISTINCT b) as neighbors`,
        { wallet }
      );
      const neighbors = result.records[0].get("neighbors").toNumber();
      return { score: Math.min(neighbors / 10, 1), weight: 0.3 };
    } finally {
      await session.close();
    }
  }

  async getGitcoinScore(wallet: string): Promise<SybilSignal> {
    try {
      const res = await axios.get(`https://passport.gitcoin.co/api/v1/stamps/${wallet}`);
      const stamps = res.data?.items?.length || 0;
      return { score: Math.min(stamps / 5, 1), weight: 0.4 };
    } catch {
      return { score: 0, weight: 0.4 };
    }
  }

  async getBrightIdScore(wallet: string): Promise<SybilSignal> {
    try {
      const res = await axios.get(`https://app.brightid.org/node/v5/users/${wallet}`);
      if (res.data?.unique) {
        return { score: 1, weight: 0.3 };
      }
      return { score: 0, weight: 0.3 };
    } catch {
      return { score: 0, weight: 0.3 };
    }
  }

  async computeSybilScore(wallet: string): Promise<number> {
    const [g, git, bright] = await Promise.all([
      this.getGraphScore(wallet),
      this.getGitcoinScore(wallet),
      this.getBrightIdScore(wallet),
    ]);

    const weighted = [g, git, bright].reduce((acc, s) => acc + s.score * s.weight, 0);
    return parseFloat(weighted.toFixed(2));
  }
}


