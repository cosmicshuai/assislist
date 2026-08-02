// index.js — Todo System API entry (also serves the built client)
import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, config.host, () => {
  console.log(`🚀 Todo System API on http://${config.host}:${config.port}`);
});

export default app;
