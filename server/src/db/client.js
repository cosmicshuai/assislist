// db/client.js — Postgres pool + drizzle instance
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';
import { poolConfig } from './poolConfig.js';

const { Pool } = pg;

export const pool = new Pool(poolConfig());

export const db = drizzle({ client: pool, schema });
