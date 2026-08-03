// lib/params.js — request parameter parsing with typed failures.
//
// `Number(req.params.id)` on a non-numeric path segment yields NaN, which the
// driver hands to Postgres as an invalid integer literal. That surfaced as a
// 500, which tells agents and monitoring the *server* is broken and makes
// agents retry a request that can never succeed.

export class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BadRequestError';
    this.status = 400;
  }
}

/** Parse a required positive integer (an entity id). Throws BadRequestError. */
export function requireId(value, field = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new BadRequestError(`${field} must be a positive integer`);
  }
  return n;
}

/**
 * Parse an optional integer. Returns undefined when absent, throws on garbage
 * — silently dropping a bad filter would return the wrong rows, not no rows.
 */
export function optionalId(value, field) {
  if (value === undefined || value === null || value === '') return undefined;
  return requireId(value, field);
}

/** Parse an optional bounded positive integer, e.g. ?limit=. */
export function optionalCount(value, field, { min = 1, max = 100, fallback } = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n)) throw new BadRequestError(`${field} must be an integer`);
  return Math.min(Math.max(n, min), max);
}

/** Validate a value against an allowed set. Returns undefined when absent. */
export function optionalEnum(value, allowed, field) {
  if (value === undefined || value === null || value === '') return undefined;
  if (!allowed.includes(value)) {
    throw new BadRequestError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}
