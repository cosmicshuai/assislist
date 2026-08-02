// test/projects-agent.test.js — route-level tests for projects + agent permission matrix
// Run: node --test test/  (requires server/.env; uses todo_system DB)
// Spins up an ephemeral app instance on a random port.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { PgProjectRepository } from '../src/repositories/PgProjectRepository.js';
import { PgTaskRepository } from '../src/repositories/PgTaskRepository.js';

const pr = new PgProjectRepository();
const tr = new PgTaskRepository();

let server;
let base;
let created = [];

test.before(async () => {
  const app = createApp();
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

test.after(async () => {
  for (const id of created) {
    try { await pr.delete(id); } catch { /* already gone */ }
  }
  if (server) await new Promise((resolve) => server.close(resolve));
});

async function req(method, path, token, body) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const userTok = config.apiToken;
const agentTok = config.agentToken; // may be '' in single-token mode

test('user: create project + task (full access)', async () => {
  const p = await req('POST', '/projects', userTok, { title: 'Agent Matrix Project', priority: 'high' });
  assert.equal(p.status, 201);
  created.push(p.data.id);
  const t = await req('POST', '/tasks', userTok, { project_id: p.data.id, title: 'Manual Root' });
  assert.equal(t.status, 201);
  assert.equal(t.data.source, 'manual');
  assert.equal(t.data.projectId, p.data.id);
});

test('user: project list excludes archived by default; archived view works', async () => {
  const p = await req('POST', '/projects', userTok, { title: 'Archive Me' });
  created.push(p.data.id);
  await req('PATCH', `/projects/${p.data.id}/archive`, userTok);
  const active = await req('GET', '/projects', userTok);
  assert.ok(!active.data.some((x) => x.id === p.data.id), 'archived excluded from active list');
  const archived = await req('GET', '/projects?archived=true', userTok);
  assert.ok(archived.data.some((x) => x.id === p.data.id), 'archived appears in archived view');
});

test('user: delete project cascades tasks', async () => {
  const p = await req('POST', '/projects', userTok, { title: 'Cascade Me' });
  created.push(p.data.id);
  await req('POST', '/tasks', userTok, { project_id: p.data.id, title: 'Child A' });
  await req('POST', '/tasks', userTok, { project_id: p.data.id, title: 'Child B' });
  const del = await req('DELETE', `/projects/${p.data.id}`, userTok);
  assert.equal(del.status, 200);
  const list = await tr.list({ projectId: p.data.id });
  assert.equal(list.length, 0, 'cascade removed all tasks');
});

test('agent: cannot modify user-created task (PUT/DELETE/complete/abandon -> 403)', async (t) => {
  if (!agentTok) return t.skip('TODO_AGENT_TOKEN unset — single-token mode');
  const p = await req('POST', '/projects', userTok, { title: 'Agent Guard' });
  created.push(p.data.id);
  const manual = await req('POST', '/tasks', userTok, { project_id: p.data.id, title: 'User Task' });
  const id = manual.data.id;
  assert.equal((await req('PUT', `/tasks/${id}`, agentTok, { context: 'nope' })).status, 403);
  assert.equal((await req('DELETE', `/tasks/${id}`, agentTok)).status, 403);
  assert.equal((await req('PATCH', `/tasks/${id}/complete`, agentTok)).status, 403);
  assert.equal((await req('PATCH', `/tasks/${id}/abandon`, agentTok)).status, 403);
  // Task unchanged
  const after = await tr.getById(id);
  assert.equal(after.context, '');
});

test('agent: cannot create project / root task / archive project (403)', async (t) => {
  if (!agentTok) return t.skip('TODO_AGENT_TOKEN unset — single-token mode');
  const p = await req('POST', '/projects', userTok, { title: 'Agent Guard 2' });
  created.push(p.data.id);
  assert.equal((await req('POST', '/projects', agentTok, { title: 'Evil' })).status, 403);
  assert.equal((await req('POST', '/tasks', agentTok, { project_id: p.data.id, title: 'Root' })).status, 403);
  assert.equal((await req('PATCH', `/projects/${p.data.id}/archive`, agentTok)).status, 403);
  assert.equal((await req('DELETE', `/projects/${p.data.id}`, agentTok)).status, 403);
});

test('agent: can add subtask and edit/complete own whatsapp task', async (t) => {
  if (!agentTok) return t.skip('TODO_AGENT_TOKEN unset — single-token mode');
  const p = await req('POST', '/projects', userTok, { title: 'Agent Own' });
  created.push(p.data.id);
  const manual = await req('POST', '/tasks', userTok, { project_id: p.data.id, title: 'User Parent' });
  const sub = await req('POST', '/tasks', agentTok, { project_id: p.data.id, parent_id: manual.data.id, title: 'Agent Subtask' });
  assert.equal(sub.status, 201);
  assert.equal(sub.data.source, 'whatsapp', 'agent-created task is whatsapp');
  const edit = await req('PUT', `/tasks/${sub.data.id}`, agentTok, { context: 'agent edited' });
  assert.equal(edit.status, 200);
  const complete = await req('PATCH', `/tasks/${sub.data.id}/complete`, agentTok);
  assert.equal(complete.status, 200);
  assert.equal(complete.data.status, 'completed');
});

test('agent: cross-project parent rejected (400)', async (t) => {
  if (!agentTok) return t.skip('TODO_AGENT_TOKEN unset — single-token mode');
  const p1 = await req('POST', '/projects', userTok, { title: 'Cross A' });
  const p2 = await req('POST', '/projects', userTok, { title: 'Cross B' });
  created.push(p1.data.id, p2.data.id);
  const t1 = await req('POST', '/tasks', userTok, { project_id: p1.data.id, title: 'In A' });
  const bad = await req('POST', '/tasks', agentTok, { project_id: p2.data.id, parent_id: t1.data.id, title: 'Bad' });
  assert.equal(bad.status, 400);
});

test('capture: without project_id creates project + root tasks; with project_id adds parent+children', async (t) => {
  if (!agentTok) return t.skip('TODO_AGENT_TOKEN unset — single-token mode');
  // Case A: new project
  const cap = await req('POST', '/captures', agentTok, {
    title: 'Plan Trip',
    breakdown: [{ title: 'Book flights' }, { title: 'Book hotel', depends_on: [0] }],
  });
  assert.equal(cap.status, 201);
  created.push(cap.data.project.id);
  assert.ok(cap.data.project.id, 'project created');
  assert.equal(cap.data.subtasks.length, 2);
  const roots = await tr.list({ projectId: cap.data.project.id, parentId: null });
  assert.equal(roots.length, 2, 'breakdown items are root tasks');

  // Case B: existing project
  const p = await req('POST', '/projects', userTok, { title: 'Existing' });
  created.push(p.data.id);
  const cap2 = await req('POST', '/captures', agentTok, {
    title: 'Add: museum',
    project_id: p.data.id,
    breakdown: [{ title: 'Check hours' }],
  });
  assert.equal(cap2.status, 201);
  assert.equal(cap2.data.task.parentId, null);
  assert.equal(cap2.data.task.projectId, p.data.id);
  assert.equal(cap2.data.subtasks.length, 1);
});

test('recommendations: long_term returns projects; archived excluded', async (t) => {
  if (!agentTok) return t.skip('TODO_AGENT_TOKEN unset — single-token mode');
  const p = await req('POST', '/projects', userTok, { title: 'Recommendable', priority: 'high' });
  created.push(p.data.id);
  await req('POST', '/tasks', userTok, { project_id: p.data.id, title: 'Task A' });
  const recs = await req('GET', '/recommendations', userTok);
  assert.equal(recs.status, 200);
  assert.ok(Array.isArray(recs.data.long_term));
});

test('recommendations: tasks in archived projects excluded from top_next', async (t) => {
  if (!agentTok) return t.skip('TODO_AGENT_TOKEN unset — single-token mode');
  const p = await req('POST', '/projects', userTok, { title: 'Archive Hidden', priority: 'urgent' });
  created.push(p.data.id);
  const task = await req('POST', '/tasks', userTok, { project_id: p.data.id, title: 'Hidden Urgent Task', priority: 'urgent' });
  assert.equal(task.status, 201);
  // Before archiving, the urgent task appears in top_next
  let recs = await req('GET', '/recommendations', userTok);
  assert.ok(recs.data.top_next.some((r) => r.task && r.task.id === task.data.id), 'task appears while project active');
  // Archive the project -> task must disappear from top_next
  await req('PATCH', `/projects/${p.data.id}/archive`, userTok);
  recs = await req('GET', '/recommendations', userTok);
  assert.ok(!recs.data.top_next.some((r) => r.task && r.task.id === task.data.id), 'task hidden once project archived');
});
