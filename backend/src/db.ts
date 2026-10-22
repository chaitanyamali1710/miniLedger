import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
});

// Creates the tables if they do not exist yet. Safe to run on every start.
export async function migrate() {
  const sql = fs.readFileSync(path.join(import.meta.dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}
