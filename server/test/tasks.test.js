// test/tasks.test.js — integration tests against a scratch schema in dev DB
// Run: node --test test/  (requires server/.env; uses todo_system DB)
import test from 'node:test';
import assert from 'node:assert/strict';
import { PgTaskRepository } from '../src/repositories/PgTaskRepository.js';
import { deriveUrgency } from '../src/services/urgencyService.js';
import { DependencyBlockedError, DependencyCycleError } from '../src/repositories/TaskRepository.js';

const repo = new PgTaskRepository();

async function cleanup(id) {
  try { await repo.delete(id); } catch { /* already gone */ }
}

test('deriveUrgency: no due date returns priority', () => {
  assert.equal(deriveUrgency({ priority: 'high' }), 'high');
  assert.equal(deriveUrgency({ priority: 'urgent' }), 'urgent');
});

test('deriveUrgency: due within 48h is urgent', () => {
  const soon = new Date(Date.now() + 24 * 36e5); // +1 day
  assert.equal(deriveUrgency({ priority: 'low', dueDate: soon }), 'urgent');
});

test('deriveUrgency: due within a week with medium priority is high', () => {
  const week = new Date(Date.now() + 3 * 864e5); // +3 days
  assert.equal(deriveUrgency({ priority: 'medium', dueDate: week }), 'high');
});

test('repo: create + get + children', async () => {
  const p = await repo.create({ title: 'Parent test', source: 'whatsapp' });
  const a = await repo.create({ title: 'Child A', parentId: p.id });
  const b = await repo.create({ title: 'Child B', parentId: p.id });
  const kids = await repo.getChildren(p.id);
  assert.equal(kids.length, 2);
  const got = await repo.getById(p.id);
  assert.equal(got.title, 'Parent test');
  await cleanup(p.id);
});

test('repo: strict block — cannot complete blocked task', async () => {
  const p = await repo.create({ title: 'Block parent' });
  const a = await repo.create({ title: 'Blocker', parentId: p.id });
  const b = await repo.create({ title: 'Blocked task', parentId: p.id });
  await repo.addDependency(b.id, a.id);
  await assert.rejects(() => repo.complete(b.id), DependencyBlockedError);
  await repo.complete(a.id);
  const done = await repo.complete(b.id);
  assert.equal(done.status, 'completed');
  await cleanup(p.id);
});

test('repo: cycle rejection', async () => {
  const p = await repo.create({ title: 'Cycle parent' });
  const a = await repo.create({ title: 'A', parentId: p.id });
  const b = await repo.create({ title: 'B', parentId: p.id });
  await repo.addDependency(a.id, b.id);
  await assert.rejects(() => repo.addDependency(b.id, a.id), DependencyCycleError);
  await cleanup(p.id);
});

test('repo: self dependency rejected', async () => {
  const p = await repo.create({ title: 'Self parent' });
  const a = await repo.create({ title: 'Self', parentId: p.id });
  await assert.rejects(() => repo.addDependency(a.id, a.id), DependencyCycleError);
  await cleanup(p.id);
});

test('repo: createTree wires parent, children, deps', async () => {
  const { parent, children } = await repo.createTree(
    { title: 'Tree parent', priority: 'high' },
    [
      { title: 'Step 1' },
      { title: 'Step 2', dependsOn: [0] },
      { title: 'Step 3', dependsOn: [0, 1] },
    ],
  );
  assert.equal(children.length, 3);
  const blockers2 = await repo.getBlockedBy(children[1].id);
  assert.equal(blockers2.length, 1);
  assert.equal(blockers2[0].title, 'Step 1');
  const blockers3 = await repo.getBlockedBy(children[2].id);
  assert.equal(blockers3.length, 2);
  await cleanup(parent.id);
});
