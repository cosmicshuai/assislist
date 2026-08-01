// api/client.ts — typed fetch wrapper for the Todo System API
// The token is injected at build time via Vite env (see .env in client/).
// For local dev the Vite proxy forwards /api to 192.168.1.180:3456.

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';
const TOKEN = import.meta.env.VITE_TODO_API_TOKEN || '';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'active' | 'completed';

export interface Task {
  id: number;
  title: string;
  context: string;
  status: TaskStatus;
  priority: Priority;
  urgency: Priority;
  dueDate: string | null;
  parentId: number | null;
  source: 'manual' | 'whatsapp';
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  children?: Task[];
  blocked_by?: Task[];
  blocks?: Task[];
}

export interface TaskInput {
  title?: string;
  context?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | null;
  parentId?: number | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  urgency?: Priority;
  due?: 'today' | 'overdue' | 'upcoming';
  q?: string;
  parent_id?: number;
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

export interface Recommendation {
  task: Task;
  reason: string;
}

export interface Recommendations {
  top_next: Recommendation[];
  long_term: Recommendation[];
}

export const api = {
  listTasks: (filters: TaskFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const qs = params.toString();
    return request<Task[]>(`/tasks${qs ? `?${qs}` : ''}`);
  },
  getTask: (id: number) => request<Task>(`/tasks/${id}`),
  createTask: (data: TaskInput) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(toWire(data)) }),
  updateTask: (id: number, data: TaskInput) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(toWire(data)) }),
  completeTask: (id: number) =>
    request<Task>(`/tasks/${id}/complete`, { method: 'PATCH' }),
  deleteTask: (id: number) => request<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
  addDependency: (taskId: number, dependsOnId: number) =>
    request<{ success: boolean }>(`/tasks/${taskId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ depends_on_id: dependsOnId }),
    }),
  removeDependency: (taskId: number, depId: number) =>
    request<{ success: boolean }>(`/tasks/${taskId}/dependencies/${depId}`, { method: 'DELETE' }),
  getRecommendations: () => request<Recommendations>('/recommendations'),
};
