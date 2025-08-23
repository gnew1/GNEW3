
import { runRetentionJob } from "../src/dataRetention";
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/gnew_privacy"
});

beforeAll(async () => {
  await pool.query("CREATE TEMP TABLE test_data(id SERIAL, created_at TIMESTAMP)");
  await pool.query(
    "INSERT INTO test_data(created_at) VALUES (NOW() - INTERVAL '40 days'), (NOW())"
  );
  await pool.query(
    "INSERT INTO retention_rules(id, table, column, days, jurisdiction, active) VALUES($1,$2,$3,$4,$5,$6)",
    [
      "11111111-1111-1111-1111-111111111111",
      "test_data",
      "created_at",
      30,
      "EU",
      true
    ]
  );
});

afterAll(async () => {
  await pool.end();
});

test("Retention job deletes old records", async () => {
  await runRetentionJob();
  const res = await pool.query("SELECT * FROM test_data");
  expect(res.rows.length).toBe(1);
});


/apps/legaltech/package.json (fragmento)

{
  "scripts": {
    "dev:retention": "ts-node src/dataRetention.ts",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "pg": "^8.11.5",
    "node-cron": "^3.0.3",
    "pino": "^9.4.0"
  },
  "devDependencies": {
    "ts-node": "^10.9.2",
    "jest": "^29.7.0"
  }
}


