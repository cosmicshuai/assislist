// index.js — Todo System API entry
import express from 'express';
import { config } from './config.js';

const app = express();
app.use(express.json());

// Liveness — unauthenticated
app.get('/api/v1/health', (req, res) => {
  res.json({ ok: true, service: 'todo-system', time: new Date().toISOString() });
});

// Placeholder root
app.get('/', (req, res) => {
  res.json({ service: 'todo-system', docs: '/api/v1/health' });
});

app.listen(config.port, config.host, () => {
  console.log(`🚀 Todo System API on http://${config.host}:${config.port}`);
});
