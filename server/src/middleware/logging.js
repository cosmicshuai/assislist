// middleware/logging.js — structured request logging + the terminal error handler
import { config } from '../config.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function enabled(level) {
  return LEVELS[level] <= (LEVELS[config.logLevel] ?? LEVELS.info);
}

export function log(level, message, fields = {}) {
  if (!enabled(level)) return;
  const line = { level, msg: message, time: new Date().toISOString(), ...fields };
  const sink = level === 'error' ? console.error : console.log;
  sink(config.isProduction ? JSON.stringify(line) : formatHuman(line));
}

function formatHuman({ level, msg, time, ...rest }) {
  const extras = Object.entries(rest).map(([k, v]) => `${k}=${v}`).join(' ');
  return `${time} ${level.toUpperCase().padEnd(5)} ${msg}${extras ? ` ${extras}` : ''}`;
}

/**
 * One line per request: method, path, status, duration, actor.
 *
 * Deliberately never logs headers or bodies — the Authorization header is a
 * credential and capture payloads are the user's personal task content.
 */
export function requestLogger() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      log(res.statusCode >= 500 ? 'error' : 'info', 'request', {
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        ms: ms.toFixed(1),
        actor: req.actor ?? 'anon',
      });
    });
    next();
  };
}

/**
 * Terminal error handler. Guarantees the documented `{ error }` JSON shape for
 * everything, including errors Express would otherwise render as an HTML page
 * with a stack trace in it.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies this by arity
export function errorHandler(err, req, res, next) {
  // Body-parser failures are client errors, not server faults. Match on
  // body-parser's own markers (it sets `type` and attaches the raw `body`) —
  // a bare `instanceof SyntaxError` would also swallow genuine application
  // bugs and report them to the client as bad input.
  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }

  log('error', 'unhandled error', {
    method: req.method,
    path: req.originalUrl.split('?')[0],
    err: err?.message,
    stack: err?.stack,
  });

  if (res.headersSent) return next(err);
  // Never echo the message: it can carry connection strings and query text.
  res.status(500).json({ error: 'Internal error' });
}
