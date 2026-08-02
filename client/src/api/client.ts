// api/client.ts — typed fetch wrapper for the Todo System API
// The token is injected at build time via Vite env (see .env in client/).
// For local dev the Vite proxy forwards /api to 192.168.1.180:3456.

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';
const TOKEN = import.meta.env.VITE_TODO_API_TOKEN || '';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'active' | 'completed' | 'abandoned';
export type ProjectStatus = 'active' | 'completed' | 'abandoned' | 'archived';
export type Source = 'manual' | 'whatsapp';

export interface Task {
  id: number;
  projectId: number;
  title: string;
  context: string;
  status: TaskStatus;
  priority: Priority;
  urgency: Priority;
  dueDate: string | null;
  parentId: number | null;
  source: Source;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  children?: Task[];
  blocked_by?: Task[];
  blocks?: Task[];
}

export interface Project {
  id: number;
  title: string;
  context: string;
  status: ProjectStatus;
  priority: Priority;
  urgency: Priority;
  dueDate: string | null;
  source: Source;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  rootTaskCount?: number;
  openTaskCount?: number;
  totalTaskCount?: number;
  root_tasks?: Task[];
}

export interface TaskInput {
  title?: string;
  context?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  parentId?: number | null;
  projectId?: number;
}

export interface ProjectInput {
  title?: string;
  context?: string;
  status?: ProjectStatus;
  priority?: Priority;
  dueDate?: string | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  urgency?: Priority;
  due?: 'today' | 'overdue' | 'upcoming';
  q?: string;
  project_id?: number;
  parent_id?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface ProjectFilters {
  status?: ProjectStatus;
  archived?: boolean | string;
  q?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

// camelCase TaskInput -> snake_case wire format expected by the server
function toWire(data: TaskInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.title !== undefined) out.title = data.title;
  if (data.context !== undefined) out.context = data.context;
  if (data.status !== undefined) out.status = data.status;
  if (data.priority !== undefined) out.priority = data.priority;
  if (data.dueDate !== undefined) out.due_date = data.dueDate;
  if (data.parentId !== undefined) out.parent_id = data.parentId;
  if (data.projectId !== undefined) out.project_id = data.projectId;
  return out;
}

function toWireProject(data: ProjectInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.title !== undefined) out.title = data.title;
  if (data.context !== undefined) out.context = data.context;
  if (data.status !== undefined) out.status = data.status;
  if (data.priority !== undefined) out.priority = data.priority;
  if (data.dueDate !== undefined) out.due_date = data.dueDate;
  return out;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

function toQuery(params: object): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export interface Recommendation {
  task?: Task;
  project?: Project;
  reason: string;
}

export interface Recommendations {
  top_next: Recommendation[];
  long_term: Recommendation[];
  ai?: boolean;
  source?: 'engine' | 'agent';
  refreshed?: string;
}

export const api = {
  listTasks: (filters: TaskFilters = {}) =>
    request<Task[]>(`/tasks${toQuery(filters)}`),
  getTask: (id: number) => request<Task>(`/tasks/${id}`),
  createTask: (data: TaskInput) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(toWire(data)) }),
  updateTask: (id: number, data: TaskInput) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(toWire(data)) }),
  completeTask: (id: number) =>
    request<Task>(`/tasks/${id}/complete`, { method: 'PATCH' }),
  abandonTask: (id: number) =>
    request<Task>(`/tasks/${id}/abandon`, { method: 'PATCH' }),
  deleteTask: (id: number) => request<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),

  listProjects: (filters: ProjectFilters = {}) =>
    request<Project[]>(`/projects${toQuery(filters)}`),
  getProject: (id: number) => request<Project>(`/projects/${id}`),
  createProject: (data: ProjectInput) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(toWireProject(data)) }),
  updateProject: (id: number, data: ProjectInput) =>
    request<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(toWireProject(data)) }),
  archiveProject: (id: number) =>
    request<Project>(`/projects/${id}/archive`, { method: 'PATCH' }),
  restoreProject: (id: number) =>
    request<Project>(`/projects/${id}/restore`, { method: 'PATCH' }),
  deleteProject: (id: number) => request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  addDependency: (taskId: number, dependsOnId: number) =>
    request<{ success: boolean }>(`/tasks/${taskId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ depends_on_id: dependsOnId }),
    }),
  removeDependency: (taskId: number, depId: number) =>
    request<{ success: boolean }>(`/tasks/${taskId}/dependencies/${depId}`, { method: 'DELETE' }),
  getRecommendations: () => request<Recommendations>('/recommendations'),
};
