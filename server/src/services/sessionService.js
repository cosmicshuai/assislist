// services/sessionService.js — stateless browser sessions for the single
// shared user token.
//
// The UI must not ship TODO_API_TOKEN in its bundle (anyone loading the page
// would get full API access). Instead the operator enters the token once and
// the server returns an httpOnly cookie holding a signed, expiring session.
//
// The session is stateless: `v1.<expiry>.<hmac>`, signed with a key derived
// from TODO_API_TOKEN itself. That means no session store to persist, and
// rotating TODO_API_TOKEN automatically invalidates every outstanding session.
import crypto from 'node:crypto';
import { config } from '../config.js';

export const SESSION_COOKIE = 'assislist_session';

const VERSION = 'v1';

// Derive a signing key from the user token so sessions die when it rotates.
function signingKey() {
  return crypto.createHash('sha256').update(`assislist-session:${config.apiToken}`).digest();
}

function sign(payload) {
  return crypto.createHmac('sha256', signingKey()).update(payload).digest('base64url');
}

/** Mint a session valid for `config.sessionTtlSeconds`. */
export function createSession(now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + config.sessionTtlSeconds;
  const payload = `${VERSION}.${expiresAt}`;
  return { value: `${payload}.${sign(payload)}`, expiresAt };
}

/**
 * Verify a session cookie value. Returns true only for a well-formed,
 * correctly signed, unexpired session. Signature comparison is constant time.
 */
export function verifySession(value, now = Date.now()) {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [version, expiresAt, signature] = parts;
  if (version !== VERSION) return false;

  const expected = sign(`${version}.${expiresAt}`);
  if (!timingSafeEqualString(signature, expected)) return false;

  const exp = Number(expiresAt);
  return Number.isFinite(exp) && exp * 1000 > now;
}

/** Cookie options shared by login and logout so the browser can match them. */
export function cookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    // Only mark Secure when the connection actually is HTTPS — a Secure cookie
    // on a plain-HTTP LAN deployment is silently dropped by the browser.
    secure: isSecureRequest(req),
    path: '/',
  };
}

export function isSecureRequest(req) {
  if (req.secure) return true; // set by Express when trust proxy is configured
  return String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}

/** Minimal Cookie header parser — avoids a dependency for one header. */
export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Constant-time string comparison. Both sides are hashed first so that
 * differing lengths neither throw nor leak through an early return.
 */
export function timingSafeEqualString(a, b) {
  const ha = crypto.createHash('sha256').update(String(a ?? '')).digest();
  const hb = crypto.createHash('sha256').update(String(b ?? '')).digest();
  return crypto.timingSafeEqual(ha, hb);
}
