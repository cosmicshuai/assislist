// hooks/useProjects.ts — data fetching for projects (board + archived view)
import { useCallback, useEffect, useState } from 'react';
import { api, type Project, type ProjectFilters } from '../api/client';

export function useProjects(filters: ProjectFilters = {}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listProjects(filters);
      setProjects(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { projects, loading, error, reload };
}
