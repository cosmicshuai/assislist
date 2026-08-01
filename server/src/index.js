// index.js — Todo System API entry
import express from 'express';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import tasksRouter from './routes/tasks.js';
import dependenciesRouter from './routes/dependencies.js';
import capturesRouter from './routes/captures.js';
import recommendationsRouter from './routes/recommendations.js';

const app = express();
app.use(express.json());

// Liveness — unauthenticated
app.get('/api/v1/health', (req, res) => {
  res.json({ ok: true, service: 'todo-system', time: new Date().toISOString() });
});

// Root
app.get('/', (req, res) => {
  res.json({ service: 'todo-system', docs: '/api/v1/health' });
});

// Authenticated API
app.use('/api/v1/tasks', authMiddleware, tasksRouter);
app.use('/api/v1/tasks', authMiddleware, dependenciesRouter);
app.use('/api/v1/captures', authMiddleware, capturesRouter);
app.use('/api/v1/recommendations', authMiddleware, recommendationsRouter);

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(config.port, config.host, () => {
  console.log(`🚀 Todo System API on http://${config.host}:${config.port}`);
});

export default app;
