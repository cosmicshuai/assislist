// test/params.test.js — request parameter parsing (no database required)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BadRequestError,
  optionalCount,
  optionalEnum,
  optionalId,
  requireId,
} from '../src/lib/params.js';

test('requireId accepts positive integers in either form', () => {
  assert.equal(requireId('42'), 42);
  assert.equal(requireId(42), 42);
});

test('requireId rejects everything that would reach Postgres as NaN', () => {
  for (const bad of ['abc', '', '1.5', '-1', '0', null, undefined, {}, '1e3abc']) {
    assert.throws(() => requireId(bad), BadRequestError, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

test('requireId names the field it rejected', () => {
  assert.throws(() => requireId('x', 'depends_on_id'), /depends_on_id must be a positive integer/);
});

test('optionalId passes absent values through and still rejects garbage', () => {
  assert.equal(optionalId(undefined, 'project_id'), undefined);
  assert.equal(optionalId('', 'project_id'), undefined);
  assert.equal(optionalId(null, 'project_id'), undefined);
  assert.equal(optionalId('7', 'project_id'), 7);
  assert.throws(() => optionalId('abc', 'project_id'), BadRequestError);
});

test('optionalCount clamps to the allowed range and falls back when absent', () => {
  assert.equal(optionalCount(undefined, 'limit', { min: 1, max: 6, fallback: 3 }), 3);
  assert.equal(optionalCount('99', 'limit', { min: 1, max: 6, fallback: 3 }), 6);
  assert.equal(optionalCount('0', 'limit', { min: 1, max: 6, fallback: 3 }), 1);
  assert.equal(optionalCount('4', 'limit', { min: 1, max: 6, fallback: 3 }), 4);
  assert.throws(() => optionalCount('abc', 'limit'), BadRequestError);
});

test('optionalEnum validates against the allowed set', () => {
  assert.equal(optionalEnum('high', ['low', 'high'], 'priority'), 'high');
  assert.equal(optionalEnum(undefined, ['low', 'high'], 'priority'), undefined);
  assert.throws(() => optionalEnum('nope', ['low', 'high'], 'priority'), /priority must be one of/);
});
