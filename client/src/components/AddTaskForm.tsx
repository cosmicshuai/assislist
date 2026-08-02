// components/AddTaskForm.tsx — create task with project + optional parent selectors (MUI)
import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import CircularProgress from '@mui/material/CircularProgress';
import { api, type Project, type Task } from '../api/client';

interface Props {
  onCreated: () => void;
  projectId?: number | null;
  parentId?: number | null;
}

const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export function AddTaskForm({ onCreated, projectId = null, parentId = null }: Props) {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>(projectId ?? '');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<number | ''>(parentId ?? '');
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects once for the selector (non-archived)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.listProjects({});
        if (!alive) return;
        setProjects(data);
        // If a projectId was passed but isn't in the list (e.g. archived), keep it anyway
        if (!projectId && data.length > 0) setSelectedProjectId(data[0].id);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load projects');
      } finally {
        if (alive) setLoadingProjects(false);
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  // Load tasks for the selected project (any depth) for the parent selector
  useEffect(() => {
    let alive = true;
    if (selectedProjectId === '') {
      setTasks([]);
      setSelectedParentId('');
      return () => { alive = false; };
    }
    setLoadingTasks(true);
    (async () => {
      try {
        const data = await api.listTasks({ project_id: Number(selectedProjectId) });
        if (!alive) return;
        setTasks(data);
        // If parentId passed belongs to this project, keep it; else clear
        if (parentId && data.some((t) => t.id === parentId)) {
          setSelectedParentId(parentId);
        } else {
          setSelectedParentId('');
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load tasks');
      } finally {
        if (alive) setLoadingTasks(false);
      }
    })();
    return () => { alive = false; };
  }, [selectedProjectId, parentId]);

  // Compute display depth for each task so the parent selector can indent
  const depthOf = useMemo(() => {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    const depth = new Map<number, number>();
    function compute(t: Task): number {
      if (depth.has(t.id)) return depth.get(t.id)!;
      const d = t.parentId && byId.has(t.parentId) ? compute(byId.get(t.parentId)!) + 1 : 0;
      depth.set(t.id, d);
      return d;
    }
    tasks.forEach(compute);
    return depth;
  }, [tasks]);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => (depthOf.get(a.id) ?? 0) - (depthOf.get(b.id) ?? 0) || a.title.localeCompare(b.title)),
    [tasks, depthOf],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (selectedProjectId === '') {
      setError('Please select a project');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createTask({
        title: title.trim(),
        context: context.trim(),
        priority,
        projectId: Number(selectedProjectId),
        parentId: selectedParentId === '' ? null : Number(selectedParentId),
      });
      setTitle('');
      setContext('');
      setPriority('medium');
      setSelectedParentId('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box component="form" onSubmit={submit} noValidate>
        <Stack spacing={1.5}>
          <TextField
            size="small"
            fullWidth
            label="Task title"
            placeholder="e.g. Book flights"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <FormControl size="small" fullWidth required>
            <InputLabel>Project</InputLabel>
            <Select
              label="Project"
              value={selectedProjectId}
              onChange={(e) => { setSelectedProjectId(e.target.value); setSelectedParentId(''); }}
              disabled={loadingProjects}
            >
              {loadingProjects ? (
                <MenuItem disabled value=""><CircularProgress size={16} /></MenuItem>
              ) : (
                projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth disabled={selectedProjectId === '' || loadingTasks}>
            <InputLabel>Parent task (optional)</InputLabel>
            <Select
              label="Parent task (optional)"
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
              displayEmpty
            >
              <MenuItem value=""><em>None — root task</em></MenuItem>
              {loadingTasks ? (
                <MenuItem disabled value=""><CircularProgress size={16} /></MenuItem>
              ) : (
                sortedTasks.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box component="span" sx={{ pl: (depthOf.get(t.id) ?? 0) * 2, display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                      <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.75rem', flexShrink: 0 }}>
                        {'— '.repeat(depthOf.get(t.id) ?? 0)}
                      </Box>
                      <Box component="span" sx={{ textDecoration: t.status === 'completed' ? 'line-through' : 'none', opacity: t.status === 'completed' ? 0.6 : 1 }}>
                        {t.title}
                      </Box>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <TextField
            size="small"
            fullWidth
            label="Context (optional)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            multiline
            minRows={1}
            maxRows={3}
          />
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <TextField
              select
              size="small"
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              sx={{ minWidth: 140 }}
            >
              {PRIORITIES.map((p) => (
                <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>{p}</MenuItem>
              ))}
            </TextField>
            <Button type="submit" variant="contained" disabled={submitting || !title.trim() || selectedProjectId === ''}>
              {submitting ? 'Adding…' : 'Add'}
            </Button>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </Box>
    </Paper>
  );
}
