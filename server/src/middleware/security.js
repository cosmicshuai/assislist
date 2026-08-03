// middleware/security.js — HTTP hardening: response headers + rate limits
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';

/**
 * Security response headers.
 *
 * The CSP is tuned to what the app actually loads: Vite emits external script
 * bundles ('self'), MUI/Emotion inject runtime <style> tags ('unsafe-inline'
 * for styles only, never for scripts), and everything else — API calls, the
 * PWA manifest, the service worker — is same-origin.
 */
export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        scriptSrc: ["'self'"],
        // Emotion injects <style> at runtime; there is no way around this for
        // MUI. Scripts stay strictly 'self', which is what blocks XSS payloads.
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        objectSrc: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: null,
      },
    },
    // The reverse proxy owns HSTS. Sending it from here would pin browsers to
    // https:// for a host that may only ever serve plain HTTP on a LAN.
    hsts: config.enableHsts
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
    crossOriginEmbedderPolicy: false, // not needed; would break nothing but adds no value here
    // Match the CSP's frame-ancestors 'none' for browsers that only honour XFO.
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'same-origin' },
  });
}

/**
 * General API limiter. Generous — this is a personal app, and the UI fans out
 * several requests per view — but bounded, so a runaway agent or a scanner
 * cannot spin the database.
 */
export function apiLimiter() {
  return rateLimit({
    windowMs: 60_000,
    limit: config.rateLimitPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  });
}

/**
 * Strict limiter for the unlock endpoint. This is the one place where an
 * attacker can guess the shared token, so failures are cheap to make expensive.
 * Successful logins are not counted, so a legitimate operator is never locked
 * out by their own usage.
 */
export function loginLimiter() {
  return rateLimit({
    windowMs: 15 * 60_000,
    limit: config.loginAttemptsPerWindow,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many unlock attempts — try again later' },
  });
}
