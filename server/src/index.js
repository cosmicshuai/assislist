// index.js — AssisList API entry (also serves the built client)
import { createApp } from './app.js';
import { config, validateConfig } from './config.js';
import { pool } from './db/client.js';
import { log } from './middleware/logging.js';
import { runMigrations } from './migrate.js';

// How long to keep retrying a database that isn't up yet. Compose starts the
// app only once Postgres is healthy, but a bare `docker run` or a restarting
// database still needs a grace period.
const MIGRATE_RETRY_WINDOW_MS = 60_000;
const MIGRATE_RETRY_DELAY_MS = 2_000;
// Give in-flight requests a moment to finish before forcing exit on SIGTERM.
const SHUTDOWN_GRACE_MS = 10_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Connection-level failures are worth retrying; a rejected migration is not. */
function isConnectionError(err) {
  const codes = ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNRESET', '57P03'];
  const seen = new Set();
  for (let e = err; e && !seen.has(e); e = e.cause) {
    seen.add(e);
    if (codes.includes(e.code)) return true;
    if (Array.isArray(e.errors) && e.errors.some((inner) => codes.includes(inner?.code))) return true;
  }
  return false;
}

/**
 * Apply migrations, retrying only while the database is unreachable.
 *
 * Starting anyway on failure — the previous behaviour — was worse than
 * crashing: the container stayed "healthy" while every request 500'd, and new
 * code ran against an old schema.
 */
async function migrateOrExit() {
  const deadline = Date.now() + MIGRATE_RETRY_WINDOW_MS;
  for (;;) {
    try {
      await runMigrations();
      log('info', 'migrations applied');
      return;
    } catch (err) {
      if (isConnectionError(err) && Date.now() < deadline) {
        log('warn', 'database not reachable yet; retrying migration', { err: err.message });
        await sleep(MIGRATE_RETRY_DELAY_MS);
        continue;
      }
      log('error', 'migration failed — refusing to start against an unknown schema', {
        err: err.message,
        hint: "fix the database, or set AUTO_MIGRATE=false and run 'npm run migrate' manually",
      });
      process.exit(1);
    }
  }
}

function installShutdownHandlers(server) {
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log('info', 'shutting down', { signal });

    const force = setTimeout(() => {
      log('warn', 'shutdown timed out; forcing exit');
      process.exit(1);
    }, SHUTDOWN_GRACE_MS);
    force.unref();

    server.close(async () => {
      try {
        await pool.end();
      } catch (err) {
        log('warn', 'error draining the connection pool', { err: err.message });
      }
      clearTimeout(force);
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

async function main() {
  const errors = validateConfig();
  if (errors.length > 0) {
    for (const e of errors) log('error', 'invalid configuration', { problem: e });
    process.exit(1);
  }

  if (config.autoMigrate) await migrateOrExit();

  const app = createApp();
  const server = app.listen(config.port, config.host, () => {
    log('info', 'AssisList API listening', { url: `http://${config.host}:${config.port}` });
  });
  installShutdownHandlers(server);
  return server;
}

main();

export default main;
