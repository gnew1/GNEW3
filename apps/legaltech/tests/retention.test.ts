
import { manualDSARDelete } from "../src/retention";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/gnew_privacy"
});

describe("Retention & Minimization", () => {
  beforeAll(async () => {
    await pool.query("DELETE FROM data_records");
    await pool.query("DELETE FROM retention_audit");
  });

  it("should respect DSAR delete", async () => {
    await pool.query(
      "INSERT INTO data_records(user_id, category, payload) VALUES($1,$2,$3)",
      ["u123", "user_activity", { some: "data" }]
    );
    const count = await manualDSARDelete("u123");
    expect(count).toBe(1);

    const audit = await pool.query("SELECT * FROM retention_audit WHERE dsar=true");
    expect(audit.rowCount).toBe(1);
  });
});


/apps/legaltech/package.json (fragmento actualizado)

{
  "scripts": {
    "dev": "ts-node src/retention.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "luxon": "^3.4.4",
    "node-cron": "^3.0.3",
    "pg": "^8.11.5"
  }
}


