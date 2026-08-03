// app.js — Express app factory (no listen; tests use this on ephemeral ports)
import path from 'node:path';
import express from 'express';
import { authMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import tasksRouter from './routes/tasks.js';
import projectsRouter from './routes/projects.js';
import dependenciesRouter from './routes/dependencies.js';
import capturesRouter from './routes/captures.js';
import recommendationsRouter from './routes/recommendations.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  // Liveness — unauthenticated
  app.get('/api/v1/health', (req, res) => {
    res.json({ ok: true, service: 'assislist', time: new Date().toISOString() });
  });

  // Root — serve the client (single-port deployment: API + UI on :3456)
  const distDir = path.resolve(import.meta.dirname, '../../client/dist');
  app.use(express.static(distDir));

  // Unlock flow — unauthenticated by definition (it is how you authenticate)
  app.use('/api/v1/auth', authRouter);

  // Authenticated API
  app.use('/api/v1/projects', authMiddleware, projectsRouter);
  app.use('/api/v1/tasks', authMiddleware, tasksRouter);
  app.use('/api/v1/tasks', authMiddleware, dependenciesRouter);
  app.use('/api/v1/captures', authMiddleware, capturesRouter);
  app.use('/api/v1/recommendations', authMiddleware, recommendationsRouter);

  // 404 for unknown API routes
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // SPA fallback: any non-API GET serves index.html
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    next();
  });

  return app;
}
