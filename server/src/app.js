// app.js — Express app factory (no listen; tests use this on ephemeral ports)
import path from 'node:path';
import express from 'express';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler, requestLogger } from './middleware/logging.js';
import { apiLimiter, loginLimiter, securityHeaders } from './middleware/security.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import tasksRouter from './routes/tasks.js';
import projectsRouter from './routes/projects.js';
import dependenciesRouter from './routes/dependencies.js';
import capturesRouter from './routes/captures.js';
import recommendationsRouter from './routes/recommendations.js';

const BODY_LIMIT = '256kb';

export function createApp() {
  const app = express();

  // Only trust forwarded headers when the operator says how many proxies sit in
  // front — otherwise any client could spoof its IP past the rate limiter.
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  app.use(securityHeaders());
  app.use(requestLogger());
  app.use(express.json({ limit: BODY_LIMIT }));

  // Liveness + readiness — unauthenticated, and outside the rate limiter so a
  // burst of traffic can never make the container look unhealthy.
  app.use('/api/v1', healthRouter);

  app.use('/api', apiLimiter());

  // Root — serve the client (single-port deployment: API + UI on :3456)
  const distDir = path.resolve(import.meta.dirname, '../../client/dist');
  app.use(express.static(distDir));

  // Unlock flow — unauthenticated by definition (it is how you authenticate).
  // The strict limiter guards the one endpoint where the token can be guessed.
  app.use('/api/v1/auth/login', loginLimiter());
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

  app.use(errorHandler);

  return app;
}
