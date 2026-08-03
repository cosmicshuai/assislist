// migrate.js — apply pending drizzle migrations (used by npm run migrate
// and optionally at startup via AUTO_MIGRATE=true, the default)
import path from 'node:path';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { config } from './config.js';
import * as schema from './db/schema.ts';

const { Pool } = pg;

export async function runMigrations() {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle({ client: pool, schema });
  const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');
  await migrate(db, { migrationsFolder });
  await pool.end();
}

// Run directly: `npm run migrate`
if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  runMigrations()
    .then(() => {
      console.log('✅ migrations applied');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ migration failed:', err.message);
      process.exit(1);
    });
}
