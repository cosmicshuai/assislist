// db/poolConfig.js — how the app decides where Postgres lives.
//
// Two supported forms, in order of precedence:
//
//   1. DATABASE_URL — one connection string. Convenient, but the password must
//      be percent-encoded, so a password containing @ : / ? # silently breaks
//      it. Fine for a hand-written dev config.
//   2. Discrete PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE — what
//      Docker Compose uses. `pg` reads these itself, so the password is never
//      parsed as part of a URL and any character is safe.
import { config } from '../config.js';

export function hasDiscreteParams() {
  return Boolean(process.env.PGHOST && process.env.PGDATABASE);
}

/** Options for `new pg.Pool(...)`. Empty object = let pg read PG* env vars. */
export function poolConfig() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL };
  if (hasDiscreteParams()) return {};
  return { connectionString: config.databaseUrl };
}

/** Host/database only — safe to log, never includes credentials. */
export function describeTarget() {
  if (process.env.DATABASE_URL || !hasDiscreteParams()) {
    try {
      const url = new URL(process.env.DATABASE_URL || config.databaseUrl);
      return `${url.hostname}:${url.port || 5432}/${url.pathname.replace(/^\//, '')}`;
    } catch {
      return 'configured via DATABASE_URL';
    }
  }
  return `${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE}`;
}
