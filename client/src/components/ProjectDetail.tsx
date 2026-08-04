// components/ProjectDetail.tsx — drill-down into a real project:
// root (parent) tasks at top level, each expanding to its own children recursively.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { api, type Project, type Task } from '../api/client';
import { TaskCard } from './TaskCard';
import { SourceTag } from './SourceTag';
import { AddTaskForm } from './AddTaskForm';
import { DetailSkeleton, LoadingAnnouncer } from './Skeletons';
import { useSnackbar } from '../context/SnackbarContext';
import { collectDescendants, topoSortTasks } from '../lib/utils';

interface Props {
  projectId: number;
  onBack: () => void;
}

export function ProjectDetail({ projectId, onBack }: Props) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addParentId, setAddParentId] = useState<number | null>(null);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { notify, notifyUndo, notifyError } = useSnackbar();

  /**
   * `background: true` refreshes without tearing the view down. Every mutation
   * used to call the plain form, which set `loading` and replaced the whole
   * task list with a spinner — ticking one checkbox unmounted and remounted
   * the page. Only the initial load and a project switch should do that.
   */
  const load = useCallback(async ({ background = false } = {}) => {
    if (!background) setLoading(true);
    setError(null);
    try {
      const [p, all] = await Promise.all([api.getProject(projectId), api.listTasks({ project_id: projectId })]);
      setProject(p);
      setTasks(all);
    } catch (e) {
      // A failed background refresh must not blank out content that is still
      // on screen and still correct.
      if (background) notifyError(e, 'Could not refresh');
      else setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      if (!background) setLoading(false);
    }
  }, [projectId, notifyError]);

  useEffect(() => {
    load();
  }, [load]);

  // Build recursive children map from the flat list (dependency order within each level)
  const childrenOf = useMemo(() => {
    const map = new Map<number, Task[]>();
    tasks.forEach((t) => {
      if (t.parentId) {
        const list = map.get(t.parentId) || [];
        list.push(t);
        map.set(t.parentId, list);
      }
    });
    map.forEach((list, parentId) => {
      map.set(parentId, topoSortTasks(list));
    });
    return map;
  }, [tasks]);

  const rootTasks = useMemo(() => topoSortTasks(tasks.filter((t) => !t.parentId)), [tasks]);

  async function handleToggle(task: Task) {
    const reopening = task.status === 'completed';
    const next: Task['status'] = reopening ? 'active' : 'completed';

    // Paint the new state immediately — the checkbox is the most-used control
    // in the app and should never wait on a round trip.
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));

    try {
      if (reopening) await api.updateTask(task.id, { status: 'active' });
      else await api.completeTask(task.id);
      // Refresh in the background: completing a task can unblock others, and
      // the server owns that decision.
      await load({ background: true });
    } catch (e) {
      // Put the row back exactly as it was; the server rejected the change.
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
      notifyError(e, 'Could not update task');
    }
  }

  function handleDelete(task: Task) {
    const descendants = collectDescendants(task.id, childrenOf);
    const removed = new Set([task.id, ...descendants]);
    const snapshot = tasks;

    // Drop it from view now and hold the request for the length of the undo
    // window. DELETE is not reversible server-side, so the only real undo is
    // one that never sends it.
    setTasks((prev) => prev.filter((t) => !removed.has(t.id)));

    const label = descendants.length
      ? `Deleted "${task.title}" and ${descendants.length} subtask${descendants.length === 1 ? '' : 's'}`
      : `Deleted "${task.title}"`;

    notifyUndo(
      label,
      async () => {
        try {
          await api.deleteTask(task.id);
          await load({ background: true });
        } catch (e) {
          setTasks(snapshot);
          notifyError(e, 'Could not delete task');
        }
      },
      () => setTasks(snapshot),
    );
  }

  function handleAddSubtask(parent: Task) {
    setAddParentId(parent.id);
    setShowAdd(true);
  }

  async function archive() {
    setMenuAnchor(null);
    if (!project) return;
    const wasArchived = project.status === 'archived';
    try {
      if (wasArchived) await api.restoreProject(project.id);
      else await api.archiveProject(project.id);
      await load({ background: true });
      // Archive has a true inverse on the server, so this undo re-issues the
      // opposite call rather than deferring anything.
      notifyUndo(
        wasArchived ? 'Project restored' : 'Project archived',
        () => {},
        async () => {
          try {
            if (wasArchived) await api.archiveProject(project.id);
            else await api.restoreProject(project.id);
            await load({ background: true });
          } catch (e) {
            notifyError(e, 'Could not undo');
          }
        },
      );
    } catch (e) {
      notifyError(e, wasArchived ? 'Could not restore project' : 'Could not archive project');
    }
  }

  async function deleteProject() {
    setConfirmDelete(false);
    try {
      await api.deleteProject(projectId);
      notify('Project deleted');
      onBack();
    } catch (e) {
      notifyError(e, 'Could not delete project');
    }
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading) return <><LoadingAnnouncer label="Loading project" /><DetailSkeleton /></>;
  if (!project) return <Typography sx={{ py: 8, textAlign: 'center' }} color="text.secondary">Project not found.</Typography>;

  const openCount = tasks.filter((t) => t.status !== 'completed').length;
  const archived = project.status === 'archived';

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ mb: 2, color: 'text.secondary' }}>
        Projects
      </Button>

      <Paper variant="outlined" sx={{ p: 3, mb: 2, opacity: archived ? 0.7 : 1 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h5" sx={{ textDecoration: project.status === 'completed' ? 'line-through' : 'none' }}>
                {project.title}
              </Typography>
              {archived && <Chip label="archived" size="small" variant="outlined" color="default" />}
            </Stack>
            {project.context && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {project.context}
              </Typography>
            )}
            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75 }}>
              <SourceTag source={project.source} />
              <Chip label={project.urgency} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
              <Chip label={`${openCount} of ${tasks.length} open`} size="small" variant="outlined" />
              {rootTasks.length > 0 && <Chip label={`${rootTasks.length} parent task${rootTasks.length === 1 ? '' : 's'}`} size="small" variant="outlined" />}
            </Stack>
          </Box>
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setAddParentId(null); setShowAdd(!showAdd); }}
              sx={{ flexShrink: 0 }}
            >
              {showAdd ? 'Close' : 'Task'}
            </Button>
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-label="Project actions"
              sx={{ mt: 0.5 }}
            >
              <MoreVertIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      {showAdd && (
        <Box sx={{ mb: 2 }}>
          <AddTaskForm onCreated={() => { setShowAdd(false); load({ background: true }); }} projectId={projectId} parentId={addParentId} />
        </Box>
      )}

      {rootTasks.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No tasks yet — add one above, or let the agent break this project down from WhatsApp.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {rootTasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              children={childrenOf.get(t.id) || []}
              childrenOf={childrenOf}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onAddSubtask={handleAddSubtask}
            />
          ))}
        </Stack>
      )}

      {/* Project action menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={archive}>
          <ListItemIcon>{archived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}</ListItemIcon>
          <ListItemText>{archived ? 'Restore' : 'Archive'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setConfirmDelete(true)}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete confirm */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete project?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete "{project.title}" and all {tasks.length} of its tasks? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteProject}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
