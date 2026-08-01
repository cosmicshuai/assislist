// components/KanbanBoard.tsx — Material 3 tile board: projects grouped by urgency
import { useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Fab from '@mui/material/Fab';
import Popper from '@mui/material/Popper';
import Fade from '@mui/material/Fade';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AdjustIcon from '@mui/icons-material/Adjust';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Task } from '../api/client';
import { useTasks } from '../hooks/useTasks';
import { SourceTag } from './SourceTag';
import { AddTaskForm } from './AddTaskForm';
import { formatDue } from '../lib/utils';

interface Props {
  onOpenProject: (id: number) => void;
}

const COLUMNS = [
  { key: 'urgent', label: 'Urgent', icon: <BoltIcon />, container: 'errorContainer' as const, onContainer: 'onErrorContainer' as const, chip: 'error' as const },
  { key: 'high', label: 'High', icon: <TrendingUpIcon />, container: 'warningContainer' as const, onContainer: 'onWarningContainer' as const, chip: 'warning' as const },
  { key: 'medium', label: 'Medium', icon: <AdjustIcon />, container: 'primaryContainer' as const, onContainer: 'onPrimaryContainer' as const, chip: 'primary' as const },
  { key: 'low', label: 'Low', icon: <KeyboardArrowDownIcon />, container: 'secondaryContainer' as const, onContainer: 'onSecondaryContainer' as const, chip: 'default' as const },
  { key: 'done', label: 'Done', icon: <CheckCircleIcon />, container: 'successContainer' as const, onContainer: 'onSuccessContainer' as const, chip: 'success' as const },
];

export function KanbanBoard({ onOpenProject }: Props) {
  const { tasks, loading, error, reload } = useTasks({});
  const [showAdd, setShowAdd] = useState(false);

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

  function onEnter(e: React.MouseEvent<HTMLElement>, task: Task) {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setAnchorEl(e.currentTarget);
      setHoverTask(task);
    }, 150);
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
      </Stack>

      {showAdd && <Box sx={{ mb: 2 }}><AddTaskForm onCreated={() => { setShowAdd(false); reload(); }} /></Box>}

      <Stack spacing={3}>
        {COLUMNS.map((col) => {
          const items = columns[col.key] || [];
          if (items.length === 0 && col.key !== 'done') return null; // hide empty sections
          return (
            <Box key={col.key}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25, px: 0.5 }}>
                <Avatar
                  sx={{
                    width: 28,
                    height: 28,
                    bgcolor: col.container,
                    color: col.onContainer,
                  }}
                >
                  {col.icon}
                </Avatar>
                <Typography variant="h6" sx={{ fontSize: '1rem' }}>{col.label}</Typography>
                <Chip label={items.length} size="small" variant="outlined" />
              </Stack>

              {items.length === 0 ? (
                <Typography variant="body2" color="text.disabled" sx={{ px: 0.5 }}>
                  Nothing here yet.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)',
                      lg: 'repeat(4, 1fr)',
                    },
                    gap: 1.5,
                  }}
                >
                  {items.map((p) => (
                    <Card
                      key={p.id}
                      elevation={0}
                      onMouseEnter={(e) => onEnter(e, p)}
                      onMouseLeave={onLeave}
                      sx={{
                        bgcolor: 'surfaceContainer',
                        transition: 'transform 0.18s cubic-bezier(.2,.8,.4,1), box-shadow 0.2s, background-color 0.2s',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: 8,
                          bgcolor: 'surfaceContainerHigh',
                        },
                        opacity: p.status === 'completed' ? 0.55 : 1,
                      }}
                    >
                      <CardActionArea onClick={() => onOpenProject(p.id)}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Stack direction="row" spacing={1.5} alignItems="flex-start">
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: 'primaryContainer',
                                color: 'onPrimaryContainer',
                                fontSize: 20,
                              }}
                            >
                              {p.title.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 650, lineHeight: 1.3, textDecoration: p.status === 'completed' ? 'line-through' : 'none' }}
                              >
                                {p.title}
                              </Typography>
                              {p.context && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    mt: 0.25,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    fontSize: '0.8rem',
                                  }}
                                >
                                  {p.context}
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75 }}>
                            <SourceTag source={p.source} />
                            <Chip label={p.urgency} size="small" color={col.chip === 'default' ? 'default' : col.chip} variant="outlined" sx={{ textTransform: 'capitalize' }} />
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
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>

      {/* Floating action button — signature M3 element */}
      <Fab
        color="primary"
        aria-label="Add project"
        onClick={() => setShowAdd(true)}
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000 }}
      >
        <AddIcon />
      </Fab>

      {/* Hover preview popup */}
      <Popper open={Boolean(anchorEl)} anchorEl={anchorEl} placement="right-start" transition>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={150}>
            <Card elevation={8} sx={{ width: 300, p: 2, m: 1, bgcolor: 'surfaceContainerHigh' }}>
              {hoverTask && (
                <>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>{hoverTask.title}</Typography>
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
            </Card>
          </Fade>
        )}
      </Popper>
    </Box>
  );
}
