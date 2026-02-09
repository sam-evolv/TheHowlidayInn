// HowlidayInn: node-postgres client with SSL
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const conn = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!conn) {
  console.error("[DB] Missing DATABASE_URL");
} else if (!conn.includes("sslmode=require")) {
  console.warn("[HowlidayInn] DATABASE_URL should end with ?sslmode=require for production security");
}

const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });