// components/KanbanBoard.tsx — Material 3 tile board: real projects grouped by urgency
import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
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
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import BoltIcon from '@mui/icons-material/Bolt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AdjustIcon from '@mui/icons-material/Adjust';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { Project } from '../api/client';
import { api } from '../api/client';
import { useProjects } from '../hooks/useProjects';
import { SourceTag } from './SourceTag';
import { AddProjectForm } from './AddProjectForm';
import { AddTaskForm } from './AddTaskForm';
import { AddFab } from './AddFab';
import { ProjectPreview } from './ProjectPreview';
import { BoardSkeleton, LoadingAnnouncer } from './Skeletons';
import { useSnackbar } from '../context/SnackbarContext';
import { interactiveSurface } from '../theme/surfaces';
import { formatDue } from '../lib/utils';

interface Props {
  onOpenProject: (id: number) => void;
}

type AddMode = 'project' | 'task' | null;

const COLUMNS = [
  { key: 'urgent', label: 'Urgent', icon: <BoltIcon />, container: 'errorContainer' as const, onContainer: 'onErrorContainer' as const, chip: 'error' as const },
  { key: 'high', label: 'High', icon: <TrendingUpIcon />, container: 'warningContainer' as const, onContainer: 'onWarningContainer' as const, chip: 'warning' as const },
  { key: 'medium', label: 'Medium', icon: <AdjustIcon />, container: 'primaryContainer' as const, onContainer: 'onPrimaryContainer' as const, chip: 'primary' as const },
  { key: 'low', label: 'Low', icon: <KeyboardArrowDownIcon />, container: 'secondaryContainer' as const, onContainer: 'onSecondaryContainer' as const, chip: 'default' as const },
  { key: 'done', label: 'Done', icon: <CheckCircleIcon />, container: 'successContainer' as const, onContainer: 'onSuccessContainer' as const, chip: 'success' as const },
];

export function KanbanBoard({ onOpenProject }: Props) {
  const [showArchived, setShowArchived] = useState(false);
  const { projects, loading, error, reload } = useProjects({ archived: showArchived ? true : false });
  const [addMode, setAddMode] = useState<AddMode>(null);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { notify, notifyUndo, notifyError } = useSnackbar();

  // Hover previews are armed only where hovering is a real gesture. On touch,
  // :hover latches after a tap and the popover would stick open with no way
  // to dismiss it — there, an explicit info button opens a bottom sheet.
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)', { noSsr: true });

  // Project action menu
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuProject, setMenuProject] = useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);

  const columns = useMemo(() => {
    const groups: Record<string, Project[]> = { urgent: [], high: [], medium: [], low: [], done: [] };
    projects.forEach((p) => {
      if (p.status === 'completed') groups.done.push(p);
      else groups[p.urgency]?.push(p) || groups.medium.push(p);
    });
    return groups;
  }, [projects]);

  function onEnter(e: React.MouseEvent<HTMLElement>, project: Project) {
    if (!canHover) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    const target = e.currentTarget;
    hoverTimeout.current = setTimeout(() => {
      setAnchorEl(target);
      setPreviewProject(project);
    }, 150);
  }
  function onLeave() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setAnchorEl(null);
    setPreviewProject(null);
  }
  function closePreview() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setAnchorEl(null);
    setPreviewProject(null);
  }

  // A popover anchored to a tile has to go away when the tile moves.
  useEffect(() => {
    if (!anchorEl) return;
    window.addEventListener('scroll', closePreview, { passive: true, once: true });
    return () => window.removeEventListener('scroll', closePreview);
  }, [anchorEl]);

  useEffect(() => () => { if (hoverTimeout.current) clearTimeout(hoverTimeout.current); }, []);

  async function archive(project: Project) {
    setMenuAnchor(null);
    try {
      await api.archiveProject(project.id);
      reload();
      notifyUndo('Project archived', () => {}, async () => {
        try {
          await api.restoreProject(project.id);
          reload();
        } catch (e) {
          notifyError(e, 'Could not undo');
        }
      });
    } catch (e) {
      notifyError(e, 'Could not archive project');
    }
  }
  async function restore(project: Project) {
    setMenuAnchor(null);
    try {
      await api.restoreProject(project.id);
      reload();
      notifyUndo('Project restored', () => {}, async () => {
        try {
          await api.archiveProject(project.id);
          reload();
        } catch (e) {
          notifyError(e, 'Could not undo');
        }
      });
    } catch (e) {
      notifyError(e, 'Could not restore project');
    }
  }
  async function confirmDeleteNow() {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    setMenuAnchor(null);
    try {
      await api.deleteProject(target.id);
      notify(`Deleted "${target.title}"`);
      reload();
    } catch (e) {
      notifyError(e, 'Could not delete project');
    }
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading) return <><LoadingAnnouncer label="Loading projects" /><BoardSkeleton /></>;

  const totalOpen = projects.filter((p) => p.status !== 'completed' && p.status !== 'archived').length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5">{showArchived ? 'Archived' : 'Projects'}</Typography>
          <Typography variant="body2" color="text.secondary">
            {showArchived ? `${projects.length} archived` : `${totalOpen} open · ${projects.length} total`}
          </Typography>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={showArchived ? 'archived' : 'active'}
          onChange={(_, v) => v && setShowArchived(v === 'archived')}
        >
          <ToggleButton value="active" aria-label="Active projects">Active</ToggleButton>
          <ToggleButton value="archived" aria-label="Archived projects">Archived</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {addMode === 'project' && (
        <Box sx={{ mb: 2 }}>
          <AddProjectForm onCreated={() => { setAddMode(null); reload(); }} />
        </Box>
      )}
      {addMode === 'task' && (
        <Box sx={{ mb: 2 }}>
          <AddTaskForm onCreated={() => { setAddMode(null); reload(); }} />
        </Box>
      )}

      {showArchived ? (
        <Stack spacing={1.5}>
          {projects.length === 0 && (
            <Typography variant="body2" color="text.disabled">Nothing archived yet.</Typography>
          )}
          {projects.map((p) => (
            <Card key={p.id} elevation={0} sx={{ bgcolor: 'surfaceContainer', opacity: 0.75 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 40, height: 40, bgcolor: 'surfaceContainerHigh', color: 'text.secondary', fontSize: 20 }}>
                    {p.title.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flexGrow: 1, cursor: 'pointer' }} onClick={() => onOpenProject(p.id)}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>{p.title}</Typography>
                    {p.context && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>{p.context}</Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuProject(p); }}
                    aria-label="Project actions"
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Stack spacing={3}>
          {COLUMNS.map((col) => {
            const items = columns[col.key] || [];
            if (items.length === 0 && col.key !== 'done') return null; // hide empty sections
            return (
              <Box key={col.key}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25, px: 0.5 }}>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: col.container, color: col.onContainer }}>
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
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
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
                          ...interactiveSurface(),
                          opacity: p.status === 'completed' ? 0.55 : 1,
                        }}
                      >
                        <CardActionArea onClick={() => onOpenProject(p.id)}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primaryContainer', color: 'onPrimaryContainer', fontSize: 20 }}>
                                {p.title.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                <Typography variant="titleMedium" sx={{ fontWeight: 650, lineHeight: 1.3, textDecoration: p.status === 'completed' ? 'line-through' : 'none' }}>
                                  {p.title}
                                </Typography>
                                {p.context && (
                                  <Typography variant="bodySmall" color="text.secondary" sx={{ mt: 0.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {p.context}
                                  </Typography>
                                )}
                              </Box>
                              {!canHover && (
                                // Touch has no hover, so the context the
                                // popover carries needs its own control.
                                <IconButton
                                  size="small"
                                  aria-label={`Details for ${p.title}`}
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setPreviewProject(p); setAnchorEl(null); }}
                                  sx={{ mt: -0.5, mr: -0.5, color: 'onSurfaceVariant' }}
                                >
                                  <InfoOutlinedIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Stack>
                            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75 }}>
                              <SourceTag source={p.source} />
                              <Chip label={p.urgency} size="small" color={col.chip === 'default' ? 'default' : col.chip} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                              {p.totalTaskCount !== undefined && p.totalTaskCount > 0 && (
                                <Chip label={`${p.totalTaskCount} task${p.totalTaskCount === 1 ? '' : 's'}`} size="small" variant="outlined" />
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
      )}

      <AddFab
        onAddProject={() => setAddMode('project')}
        onAddTask={() => setAddMode('task')}
      />

      {/* Project action menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        {menuProject && menuProject.status === 'archived' ? (
          <MenuItem onClick={() => restore(menuProject)}>
            <ListItemIcon><UnarchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Restore</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={() => archive(menuProject!)}>
            <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Archive</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => setConfirmDelete(menuProject)}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete confirm */}
      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete project?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete "{confirmDelete?.title}" and all {confirmDelete?.totalTaskCount ?? 0} of its tasks? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteNow}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Project preview — hover popover on pointer devices, sheet on touch */}
      <ProjectPreview
        project={previewProject}
        anchorEl={anchorEl}
        onClose={closePreview}
        onOpenProject={onOpenProject}
      />
    </Box>
  );
}
