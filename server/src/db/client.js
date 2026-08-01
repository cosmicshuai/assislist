// db/client.js — Postgres pool + drizzle instance
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config.js';
import * as schema from './schema.ts';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

export const db = drizzle({ client: pool, schema });
