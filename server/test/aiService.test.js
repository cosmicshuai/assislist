// test/aiService.test.js — recommendation enrichment (no database, no network)
import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { enrichReasons } from '../src/services/aiService.js';

// top_next entries carry a task; long_term entries carry a project. Reading
// `entry.task.id` for both used to throw while building the request payload —
// outside the try — turning every ?ai=1 call into a 500.
const topNext = [
  { task: { id: 1, title: 'Ship it', urgency: 'high', priority: 'high', status: 'active', dueDate: null, context: '' }, reason: 'engine reason' },
];
const longTerm = [
  { project: { id: 9, title: 'Rewrite', urgency: 'medium', priority: 'medium', status: 'active', dueDate: null, context: '' }, reason: 'engine reason' },
];

test('returns input unchanged when no API key is configured', async () => {
  const original = config.deepseekApiKey;
  config.deepseekApiKey = '';
  const out = await enrichReasons({ topNext, longTerm });
  assert.equal(out.ai, false);
  assert.deepEqual(out.top_next, topNext);
  assert.deepEqual(out.long_term, longTerm);
  config.deepseekApiKey = original;
});

test('mixed task/project entries do not throw when a key is set', async () => {
  const original = config.deepseekApiKey;
  const originalFetch = globalThis.fetch;
  config.deepseekApiKey = 'test-key';
  // Fail the call: this asserts the fallback path, not the happy path, and
  // proves payload construction no longer throws before the request is made.
  globalThis.fetch = async () => { throw new Error('network down'); };
  try {
    const out = await enrichReasons({ topNext, longTerm });
    assert.equal(out.ai, false);
    assert.deepEqual(out.top_next, topNext);
    assert.deepEqual(out.long_term, longTerm);
  } finally {
    globalThis.fetch = originalFetch;
    config.deepseekApiKey = original;
  }
});

test('applies reasons keyed by task_id and project_id respectively', async () => {
  const original = config.deepseekApiKey;
  const originalFetch = globalThis.fetch;
  config.deepseekApiKey = 'test-key';
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: JSON.stringify({
            top_next: [{ task_id: 1, reason: 'rewritten task reason' }],
            long_term: [{ project_id: 9, reason: 'rewritten project reason' }],
          }),
        },
      }],
    }),
  });
  try {
    const out = await enrichReasons({ topNext, longTerm });
    assert.equal(out.ai, true);
    assert.equal(out.top_next[0].reason, 'rewritten task reason');
    assert.equal(out.long_term[0].reason, 'rewritten project reason');
    // The entities themselves must survive untouched.
    assert.equal(out.top_next[0].task.id, 1);
    assert.equal(out.long_term[0].project.id, 9);
  } finally {
    globalThis.fetch = originalFetch;
    config.deepseekApiKey = original;
  }
});

test('ignores enrichment for ids it did not ask about', async () => {
  const original = config.deepseekApiKey;
  const originalFetch = globalThis.fetch;
  config.deepseekApiKey = 'test-key';
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ top_next: [{ task_id: 999, reason: 'wrong item' }] }) } }],
    }),
  });
  try {
    const out = await enrichReasons({ topNext, longTerm });
    assert.equal(out.top_next[0].reason, 'engine reason');
  } finally {
    globalThis.fetch = originalFetch;
    config.deepseekApiKey = original;
  }
});

test('malformed upstream payloads fall back instead of throwing', async () => {
  const original = config.deepseekApiKey;
  const originalFetch = globalThis.fetch;
  config.deepseekApiKey = 'test-key';
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'not json' } }] }) });
  try {
    const out = await enrichReasons({ topNext, longTerm });
    assert.equal(out.ai, false);
    assert.deepEqual(out.top_next, topNext);
  } finally {
    globalThis.fetch = originalFetch;
    config.deepseekApiKey = original;
  }
});
