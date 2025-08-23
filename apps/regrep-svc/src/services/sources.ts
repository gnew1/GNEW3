import { Pool } from "pg"; 
const pool = new Pool({ connectionString: process.env.WAREHOUSE_PG_URL 
}); 
export async function queryRows(sql: string, start: Date, end: Date) { 
const r = await pool.query(sql, [start, end]); 
return r.rows; 
} 
