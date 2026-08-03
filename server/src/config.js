// config.js — load and validate env for the AssisList server
import 'dotenv/config';

const MIN_TOKEN_LENGTH = 16;

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const config = {
  databaseUrl: process.env.DATABASE_URL || 'postgres://assislist:assislist@localhost:5432/assislist',
  apiToken: process.env.TODO_API_TOKEN || '',
  agentToken: process.env.TODO_AGENT_TOKEN || '',
  port: num(process.env.PORT, 3456),
  host: process.env.HOST || '0.0.0.0',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
  autoMigrate: process.env.AUTO_MIGRATE !== 'false',
  // Browser session lifetime (default 30 days — this is a personal app; the
  // point of the session is to keep the token out of the bundle, not to expire
  // the operator constantly).
  sessionTtlSeconds: num(process.env.SESSION_TTL_SECONDS, 30 * 24 * 3600),
  // Number of reverse proxies in front of the app. 0 = trust nobody, which is
  // the safe default: trusting X-Forwarded-For unconditionally would let any
  // client spoof its IP and sidestep rate limiting.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  logLevel: process.env.LOG_LEVEL || 'info',
  isProduction: process.env.NODE_ENV === 'production',
  // Send HSTS. Off by default: the reverse proxy that terminates TLS should
  // own this, and sending it from a plain-HTTP LAN deployment would pin
  // browsers to an https:// URL that serves nothing.
  enableHsts: process.env.ENABLE_HSTS === 'true',
  rateLimitPerMinute: num(process.env.RATE_LIMIT_PER_MINUTE, 300),
  loginAttemptsPerWindow: num(process.env.LOGIN_ATTEMPTS_PER_15MIN, 10),
};

/**
 * Validate configuration the server cannot run without. Called at boot so
 * misconfiguration is a startup failure with a clear message, rather than an
 * opaque 500 on the first request.
 */
export function validateConfig({ warn = console.warn } = {}) {
  const errors = [];

  if (!config.apiToken) {
    errors.push('TODO_API_TOKEN is not set. Generate one with: openssl rand -hex 32');
  } else if (config.apiToken.length < MIN_TOKEN_LENGTH) {
    errors.push(`TODO_API_TOKEN is too short (${config.apiToken.length} chars; need at least ${MIN_TOKEN_LENGTH}). Generate one with: openssl rand -hex 32`);
  }

  if (config.agentToken) {
    if (config.agentToken.length < MIN_TOKEN_LENGTH) {
      errors.push(`TODO_AGENT_TOKEN is too short (need at least ${MIN_TOKEN_LENGTH} chars)`);
    }
    if (config.agentToken === config.apiToken) {
      errors.push('TODO_AGENT_TOKEN must differ from TODO_API_TOKEN, otherwise agent scope grants full access');
    }
  } else {
    warn('ℹ️  TODO_AGENT_TOKEN is unset — running in single-token mode; agents get full user access.');
  }

  if (!config.databaseUrl) errors.push('DATABASE_URL is not set');

  return errors;
}

export function requireApiToken() {
  if (!config.apiToken) {
    throw new Error('TODO_API_TOKEN is not set in server/.env');
  }
  return config.apiToken;
}

// Optional: when unset, the server falls back to single-token (user-only) mode.
export function hasAgentToken() {
  return Boolean(config.agentToken);
}
