// test/tasks.test.js — integration tests against a scratch schema in dev DB
// Run: node --test test/  (requires server/.env; uses todo_system DB)
import test from 'node:test';
import assert from 'node:assert/strict';
import { PgTaskRepository } from '../src/repositories/PgTaskRepository.js';
import { PgProjectRepository } from '../src/repositories/PgProjectRepository.js';
import { deriveUrgency } from '../src/services/urgencyService.js';
import { DependencyBlockedError, DependencyCycleError } from '../src/repositories/TaskRepository.js';

const repo = new PgTaskRepository();
const projectRepo = new PgProjectRepository();

async function cleanup(id) {
  try { await repo.delete(id); } catch { /* already gone */ }
}

// Create a scratch project for a test; returns { projectId, done() }
async function withProject() {
  const p = await projectRepo.create({ title: `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
  return {
    projectId: p.id,
    done: async () => { try { await projectRepo.delete(p.id); } catch { /* already gone */ } },
  };
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

test('repo: create + get + children (project-scoped)', async () => {
  const { projectId, done } = await withProject();
  const p = await repo.create({ projectId, title: 'Parent test', source: 'whatsapp' });
  const a = await repo.create({ projectId, title: 'Child A', parentId: p.id });
  const b = await repo.create({ projectId, title: 'Child B', parentId: p.id });
  const kids = await repo.getChildren(p.id);
  assert.equal(kids.length, 2);
  const got = await repo.getById(p.id);
  assert.equal(got.title, 'Parent test');
  assert.equal(got.projectId, projectId);
  await cleanup(p.id);
  await done();
});

test('repo: strict block — cannot complete blocked task', async () => {
  const { projectId, done } = await withProject();
  const p = await repo.create({ projectId, title: 'Block parent' });
  const a = await repo.create({ projectId, title: 'Blocker', parentId: p.id });
  const b = await repo.create({ projectId, title: 'Blocked task', parentId: p.id });
  await repo.addDependency(b.id, a.id);
  await assert.rejects(() => repo.complete(b.id), DependencyBlockedError);
  await repo.complete(a.id);
  const done2 = await repo.complete(b.id);
  assert.equal(done2.status, 'completed');
  await cleanup(p.id);
  await done();
});

test('repo: cycle rejection', async () => {
  const { projectId, done } = await withProject();
  const p = await repo.create({ projectId, title: 'Cycle parent' });
  const a = await repo.create({ projectId, title: 'A', parentId: p.id });
  const b = await repo.create({ projectId, title: 'B', parentId: p.id });
  await repo.addDependency(a.id, b.id);
  await assert.rejects(() => repo.addDependency(b.id, a.id), DependencyCycleError);
  await cleanup(p.id);
  await done();
});

test('repo: self dependency rejected', async () => {
  const { projectId, done } = await withProject();
  const p = await repo.create({ projectId, title: 'Self parent' });
  const a = await repo.create({ projectId, title: 'Self', parentId: p.id });
  await assert.rejects(() => repo.addDependency(a.id, a.id), DependencyCycleError);
  await cleanup(p.id);
  await done();
});

test('repo: createTree wires parent, children, deps (project-scoped)', async () => {
  const { projectId, done } = await withProject();
  const { parent, children } = await repo.createTree(
    { projectId, title: 'Tree parent', priority: 'high' },
    [
      { title: 'Step 1' },
      { title: 'Step 2', dependsOn: [0] },
      { title: 'Step 3', dependsOn: [0, 1] },
    ],
  );
  assert.equal(children.length, 3);
  assert.equal(parent.projectId, projectId);
  const blockers2 = await repo.getBlockedBy(children[1].id);
  assert.equal(blockers2.length, 1);
  assert.equal(blockers2[0].title, 'Step 1');
  const blockers3 = await repo.getBlockedBy(children[2].id);
  assert.equal(blockers3.length, 2);
  await cleanup(parent.id);
  await done();
});

test('repo: createRootTasks makes breakdown items root tasks', async () => {
  const { projectId, done } = await withProject();
  const roots = await repo.createRootTasks(projectId, [
    { title: 'Root 1' },
    { title: 'Root 2', dependsOn: [0] },
  ]);
  assert.equal(roots.length, 2);
  assert.equal(roots[0].parentId, null);
  assert.equal(roots[0].projectId, projectId);
  const blockers = await repo.getBlockedBy(roots[1].id);
  assert.equal(blockers.length, 1);
  for (const r of roots) await cleanup(r.id);
  await done();
});

test('repo: cross-project parent rejected', async () => {
  const a = await withProject();
  const b = await withProject();
  const t1 = await repo.create({ projectId: a.projectId, title: 'In A' });
  await assert.rejects(
    () => repo.create({ projectId: b.projectId, parentId: t1.id, title: 'Bad' }),
    /different project/,
  );
  await cleanup(t1.id);
  await a.done();
  await b.done();
});

test('repo: parentId null filters to root tasks only', async () => {
  const { projectId, done } = await withProject();
  const root = await repo.create({ projectId, title: 'Root only' });
  const child = await repo.create({ projectId, title: 'A child', parentId: root.id });

  // null means "parent_id IS NULL". Treating it as "no filter" made
  // GET /projects/:id return the whole tree under the name root_tasks.
  const roots = await repo.list({ projectId, parentId: null });
  assert.equal(roots.length, 1);
  assert.equal(roots[0].id, root.id);

  // undefined still means no filter at all.
  const all = await repo.list({ projectId });
  assert.equal(all.length, 2);

  // An explicit parent id still selects that parent's children.
  const kids = await repo.list({ projectId, parentId: root.id });
  assert.equal(kids.length, 1);
  assert.equal(kids[0].id, child.id);

  await cleanup(child.id);
  await cleanup(root.id);
  await done();
});
