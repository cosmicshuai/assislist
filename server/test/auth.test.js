// test/auth.test.js — session + token auth (no database required)
import test from 'node:test';
import assert from 'node:assert/strict';

const USER_TOKEN = 'user-token-0123456789abcdef0123456789abcdef';
const AGENT_TOKEN = 'agent-token-0123456789abcdef0123456789abcdef';

process.env.TODO_API_TOKEN = USER_TOKEN;
process.env.TODO_AGENT_TOKEN = AGENT_TOKEN;

const { createSession, verifySession, timingSafeEqualString, readCookie } =
  await import('../src/services/sessionService.js');
const { actorForToken } = await import('../src/middleware/auth.js');
const { validateConfig, config } = await import('../src/config.js');

test('actorForToken classifies user and agent tokens', () => {
  assert.equal(actorForToken(USER_TOKEN), 'user');
  assert.equal(actorForToken(AGENT_TOKEN), 'agent');
});

test('actorForToken rejects unknown, empty and near-miss tokens', () => {
  assert.equal(actorForToken(''), null);
  assert.equal(actorForToken(undefined), null);
  assert.equal(actorForToken('nope'), null);
  assert.equal(actorForToken(USER_TOKEN.slice(0, -1)), null);
  assert.equal(actorForToken(`${USER_TOKEN}x`), null);
});

test('timingSafeEqualString handles unequal lengths without throwing', () => {
  assert.equal(timingSafeEqualString('a', 'abcdef'), false);
  assert.equal(timingSafeEqualString('abc', 'abc'), true);
  assert.equal(timingSafeEqualString('', ''), true);
  assert.equal(timingSafeEqualString(undefined, ''), true);
});

test('a freshly minted session verifies', () => {
  const { value } = createSession();
  assert.equal(verifySession(value), true);
});

test('an expired session is rejected', () => {
  const past = Date.now() - (config.sessionTtlSeconds + 60) * 1000;
  const { value } = createSession(past);
  assert.equal(verifySession(value), false);
});

test('a tampered session is rejected', () => {
  const { value } = createSession();
  const [version, exp, sig] = value.split('.');
  // Extend the expiry without re-signing — the classic forgery attempt.
  assert.equal(verifySession(`${version}.${Number(exp) + 86400}.${sig}`), false);
  // Flip the signature.
  assert.equal(verifySession(`${version}.${exp}.${sig.slice(0, -1)}A`), false);
  // Wrong shape.
  assert.equal(verifySession('garbage'), false);
  assert.equal(verifySession(''), false);
  assert.equal(verifySession(undefined), false);
});

test('readCookie extracts only the named cookie', () => {
  const req = { headers: { cookie: 'a=1; assislist_session=abc%20def; b=2' } };
  assert.equal(readCookie(req, 'assislist_session'), 'abc def');
  assert.equal(readCookie(req, 'missing'), undefined);
  assert.equal(readCookie({ headers: {} }, 'a'), undefined);
});

test('validateConfig accepts a well-formed configuration', () => {
  assert.deepEqual(validateConfig({ warn: () => {} }), []);
});

// `config` is a shared mutable singleton, and the session signing key is
// derived from config.apiToken. Restoring in `finally` keeps a failed
// assertion here from cascading into every later test in the file.
function withConfig(patch, fn) {
  const saved = { ...config };
  Object.assign(config, patch);
  try {
    fn();
  } finally {
    Object.assign(config, saved);
  }
}

test('validateConfig rejects a missing or weak user token', () => {
  withConfig({ apiToken: '' }, () => {
    assert.match(validateConfig({ warn: () => {} })[0], /TODO_API_TOKEN is not set/);
  });
  withConfig({ apiToken: 'short' }, () => {
    assert.match(validateConfig({ warn: () => {} })[0], /too short/);
  });
});

test('validateConfig rejects an agent token equal to the user token', () => {
  withConfig({ agentToken: config.apiToken }, () => {
    assert.match(validateConfig({ warn: () => {} })[0], /must differ/);
  });
});

test('config is restored after the mutating tests above', () => {
  assert.equal(config.apiToken, USER_TOKEN);
  assert.equal(config.agentToken, AGENT_TOKEN);
  assert.equal(actorForToken(USER_TOKEN), 'user');
});
