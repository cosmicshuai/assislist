// index.js — AssisList API entry (also serves the built client)
import { createApp } from './app.js';
import { config } from './config.js';
import { runMigrations } from './migrate.js';

async function main() {
  if (config.autoMigrate) {
    try {
      await runMigrations();
    } catch (err) {
      console.error(`⚠️ auto-migrate failed (${err.message}); starting anyway — run 'npm run migrate' manually`);
    }
  }

  const app = createApp();
  app.listen(config.port, config.host, () => {
    console.log(`🚀 AssisList API on http://${config.host}:${config.port}`);
  });
}

main();

export default main;
