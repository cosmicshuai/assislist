// components/ProjectDetail.tsx — drill-down: a project's children tasks (MUI)
import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { api, type Task } from '../api/client';
import { TaskCard } from './TaskCard';
import { SourceTag } from './SourceTag';
import { AddTaskForm } from './AddTaskForm';

interface Props {
  projectId: number;
  onBack: () => void;
}

export function ProjectDetail({ projectId, onBack }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const all = await api.listTasks({});
      setTasks(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const project = useMemo(() => tasks.find((t) => t.id === projectId), [tasks, projectId]);
  const children = useMemo(
    () => tasks.filter((t) => t.parentId === projectId).sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
    [tasks, projectId],
  );

  async function handleToggle(task: Task) {
    try {
      if (task.status === 'completed') {
        await api.updateTask(task.id, { status: 'active' });
      } else {
        await api.completeTask(task.id);
      }
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update task');
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`Delete "${task.title}"?`)) return;
    try {
      await api.deleteTask(task.id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete task');
    }
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!project) return <Typography sx={{ py: 8, textAlign: 'center' }} color="text.secondary">Project not found.</Typography>;

  const openCount = children.filter((c) => c.status !== 'completed').length;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2, color: 'text.secondary' }}>
        Projects
      </Button>

      <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ textDecoration: project.status === 'completed' ? 'line-through' : 'none' }}>
              {project.title}
            </Typography>
            {project.context && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {project.context}
              </Typography>
            )}
            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75 }}>
              <SourceTag source={project.source} />
              <Chip label={project.urgency} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
              <Chip label={`${openCount} of ${children.length} open`} size="small" variant="outlined" />
            </Stack>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAdd(!showAdd)}
            sx={{ flexShrink: 0 }}
          >
            {showAdd ? 'Close' : 'Subtask'}
          </Button>
        </Stack>
      </Paper>

      {showAdd && (
        <Box sx={{ mb: 2 }}>
          <AddTaskForm onCreated={() => { setShowAdd(false); load(); }} parentId={projectId} />
        </Box>
      )}

      {children.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No subtasks yet — add one above, or let the agent break this project down from WhatsApp.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {children.map((c) => (
            <TaskCard
              key={c.id}
              task={c}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAddSubtask={() => { setShowAdd(true); }}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
