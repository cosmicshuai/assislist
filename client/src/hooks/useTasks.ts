// hooks/useTasks.ts — data fetching for the task list
import { useCallback, useEffect, useState } from 'react';
import { api, type Task, type TaskFilters } from '../api/client';

export function useTasks(filters: TaskFilters = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTasks(filters);
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { tasks, loading, error, reload };
}
