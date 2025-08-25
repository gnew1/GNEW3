import { Pool } from "pg";
export declare function runMigrations(pool: Pool, applyTriggers?: boolean): Promise<void>;
