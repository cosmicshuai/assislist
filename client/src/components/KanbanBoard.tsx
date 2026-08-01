// components/KanbanBoard.tsx — homepage: projects grouped by urgency (MUI)
import { useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Popper from '@mui/material/Popper';
import Fade from '@mui/material/Fade';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import type { Task } from '../api/client';
import { useTasks } from '../hooks/useTasks';
import { SourceTag } from './SourceTag';
import { AddTaskForm } from './AddTaskForm';
import { formatDue } from '../lib/utils';

interface Props {
  onOpenProject: (id: number) => void;
}

const COLUMNS = [
  { key: 'urgent', label: 'Urgent', color: 'error' as const },
  { key: 'high', label: 'High', color: 'warning' as const },
  { key: 'medium', label: 'Medium', color: 'primary' as const },
  { key: 'low', label: 'Low', color: 'default' as const },
  { key: 'done', label: 'Done', color: 'success' as const },
];

export function KanbanBoard({ onOpenProject }: Props) {
  const { tasks, loading, error, reload } = useTasks({});
  const [showAdd, setShowAdd] = useState(false);

  // Hover preview state
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [hoverTask, setHoverTask] = useState<Task | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const projects = useMemo(() => {
    const byId = new Map<number, Task>();
    tasks.forEach((t) => byId.set(t.id, t));
    const childrenOf = new Map<number, Task[]>();
    tasks.forEach((t) => {
      if (t.parentId && byId.has(t.parentId)) {
        const list = childrenOf.get(t.parentId) || [];
        list.push(t);
        childrenOf.set(t.parentId, list);
      }
    });
    return tasks
      .filter((t) => !t.parentId || !byId.has(t.parentId))
      .map((t) => ({ ...t, children: childrenOf.get(t.id) || [] }));
  }, [tasks]);

  const columns = useMemo(() => {
    const groups: Record<string, Task[]> = { urgent: [], high: [], medium: [], low: [], done: [] };
    projects.forEach((p) => {
      if (p.status === 'completed') groups.done.push(p);
      else groups[p.urgency]?.push(p) || groups.medium.push(p);
    });
    return groups;
  }, [projects]);

  // Hover with slight delay so moving across tiles doesn't flash
  function onEnter(e: React.MouseEvent<HTMLElement>, task: Task) {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setAnchorEl(e.currentTarget);
      setHoverTask(task);
    }, 180);
  }
  function onLeave() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setAnchorEl(null);
    setHoverTask(null);
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  const totalOpen = projects.filter((p) => p.status !== 'completed').length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5">Projects</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalOpen} open · {projects.length} total
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? 'Close' : 'New'}
        </Button>
      </Stack>

      {showAdd && <Box sx={{ mb: 2 }}><AddTaskForm onCreated={() => { setShowAdd(false); reload(); }} /></Box>}

      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2, alignItems: 'flex-start' }}>
        {COLUMNS.map((col) => {
          const items = columns[col.key] || [];
          return (
            <Paper
              key={col.key}
              variant="outlined"
              sx={{
                minWidth: 280,
                width: 280,
                flexShrink: 0,
                minHeight: 420,
                p: 1.5,
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1, pb: 1 }}>
                <Typography variant="overline" color={col.color} sx={{ fontWeight: 700 }}>
                  {col.label}
                </Typography>
                <Chip label={items.length} size="small" variant="outlined" />
              </Stack>
              <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
                {items.length === 0 && (
                  <Typography variant="body2" color="text.disabled" align="center" sx={{ py: 4 }}>
                    Empty
                  </Typography>
                )}
                {items.map((p) => (
                  <Card
                    key={p.id}
                    variant="outlined"
                    onMouseEnter={(e) => onEnter(e, p)}
                    onMouseLeave={onLeave}
                    sx={{
                      transition: 'transform 0.15s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                      opacity: p.status === 'completed' ? 0.55 : 1,
                    }}
                  >
                    <CardActionArea onClick={() => onOpenProject(p.id)}>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, textDecoration: p.status === 'completed' ? 'line-through' : 'none' }}>
                          {p.title}
                        </Typography>
                        {p.context && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {p.context}
                          </Typography>
                        )}
                        <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 0.75 }}>
                          <SourceTag source={p.source} />
                          <Chip label={p.urgency} size="small" color={col.color === 'default' ? 'default' : col.color} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                          {p.children && p.children.length > 0 && (
                            <Chip label={`${p.children.length} sub`} size="small" variant="outlined" />
                          )}
                          {p.dueDate && p.status !== 'completed' && (
                            <Chip label={formatDue(p.dueDate)} size="small" color="warning" variant="outlined" />
                          )}
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Stack>
            </Paper>
          );
        })}
      </Box>

      {/* Hover preview popup */}
      <Popper open={Boolean(anchorEl)} anchorEl={anchorEl} placement="right-start" transition>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={150}>
            <Paper elevation={6} sx={{ width: 300, p: 2, m: 1 }}>
              {hoverTask && (
                <>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{hoverTask.title}</Typography>
                    <SourceTag source={hoverTask.source} />
                  </Stack>
                  {hoverTask.context ? (
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {hoverTask.context}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontStyle="italic">No context</Typography>
                  )}
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75 }}>
                    <Chip label={`${hoverTask.urgency} urgency`} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                    {hoverTask.dueDate && (
                      <Chip label={formatDue(hoverTask.dueDate)} size="small" color="warning" variant="outlined" />
                    )}
                    {hoverTask.children && hoverTask.children.length > 0 && (
                      <Chip label={`${hoverTask.children.length} subtasks`} size="small" variant="outlined" />
                    )}
                    <Chip label={hoverTask.status} size="small" variant="outlined" />
                  </Stack>
                </>
              )}
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
}
