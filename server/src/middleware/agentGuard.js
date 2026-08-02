// middleware/agentGuard.js — route-level permission helpers for agent scope
// The agent may create task trees (captures) and add tasks under any task,
// and may modify only tasks it created (source='whatsapp'). It may NOT modify
// user-created tasks (source='manual') or create projects directly.
//
// Usage in routes:
//   const task = await repo.getById(id);
//   if (!agentCanModifyTask(req, task)) return res.status(403).json(...);

export function isAgent(req) {
  return req.actor === 'agent';
}

export function agentCanModifyTask(req, task) {
  if (!isAgent(req)) return true; // user has full access
  return task && task.source === 'whatsapp';
}

export function agentCanModifyProject(req, project) {
  if (!isAgent(req)) return true; // user has full access
  // Agent may never modify a project row directly (archive/restore/update/
  // delete). Projects are user-created or created via capture.
  return false;
}

export function agentForbidden(res, what = 'user-created tasks') {
  return res.status(403).json({ error: `Agent cannot modify ${what}` });
}
