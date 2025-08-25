import { ensureMigrations } from "./db/migrate";
import createApp from "./app";

const PORT = Number(process.env.PORT ?? 8096);

async function main() {
  const { app, pool } = await createApp();
  // Ensure DB schema on boot (best-effort)
  ensureMigrations(pool).catch((err) => console.warn("migrations_on_boot_failed", err));
  app.listen(PORT, () => {
    const mem = process.env.PG_MEM === "1" || process.env.DATABASE_URL === "pgmem" || process.env.DATABASE_URL === "mem";
    console.log(JSON.stringify({ level: 30, port: PORT, mem, msg: "recon-service_started" }));
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
