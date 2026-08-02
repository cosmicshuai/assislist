// components/KanbanBoard.tsx — Material 3 tile board: real projects grouped by urgency
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
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AdjustIcon from '@mui/icons-material/Adjust';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { Project } from '../api/client';
import { api } from '../api/client';
import { useProjects } from '../hooks/useProjects';
import { SourceTag } from './SourceTag';
import { AddProjectForm } from './AddProjectForm';
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
  const [showArchived, setShowArchived] = useState(false);
  const { projects, loading, error, reload } = useProjects({ archived: showArchived ? true : false });
  const [showAdd, setShowAdd] = useState(false);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [hoverProject, setHoverProject] = useState<Project | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setAnchorEl(e.currentTarget);
      setHoverProject(project);
    }, 150);
  }
  function onLeave() {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setAnchorEl(null);
    setHoverProject(null);
  }

  async function archive(project: Project) {
    try {
      await api.archiveProject(project.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to archive');
    }
    setMenuAnchor(null);
    reload();
  }
  async function restore(project: Project) {
    try {
      await api.restoreProject(project.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to restore');
    }
    setMenuAnchor(null);
    reload();
  }
  async function confirmDeleteNow() {
    if (!confirmDelete) return;
    try {
      await api.deleteProject(confirmDelete.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    }
    setConfirmDelete(null);
    setMenuAnchor(null);
    reload();
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

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

      {showAdd && <Box sx={{ mb: 2 }}><AddProjectForm onCreated={() => { setShowAdd(false); reload(); }} /></Box>}

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
                          bgcolor: 'surfaceContainer',
                          transition: 'transform 0.18s cubic-bezier(.2,.8,.4,1), box-shadow 0.2s, background-color 0.2s',
                          '&:hover': { transform: 'translateY(-3px)', boxShadow: 8, bgcolor: 'surfaceContainerHigh' },
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
                                <Typography variant="subtitle1" sx={{ fontWeight: 650, lineHeight: 1.3, textDecoration: p.status === 'completed' ? 'line-through' : 'none' }}>
                                  {p.title}
                                </Typography>
                                {p.context && (
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.8rem' }}>
                                    {p.context}
                                  </Typography>
                                )}
                              </Box>
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

      <Fab color="primary" aria-label="Add project" onClick={() => setShowAdd(true)} sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000 }}>
        <AddIcon />
      </Fab>

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

      {/* Hover preview popup */}
      <Popper open={Boolean(anchorEl)} anchorEl={anchorEl} placement="right-start" transition>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={150}>
            <Card elevation={8} sx={{ width: 300, p: 2, m: 1, bgcolor: 'surfaceContainerHigh' }}>
              {hoverProject && (
                <>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>{hoverProject.title}</Typography>
                    <SourceTag source={hoverProject.source} />
                  </Stack>
                  {hoverProject.context ? (
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {hoverProject.context}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontStyle="italic">No context</Typography>
                  )}
                  <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75 }}>
                    <Chip label={`${hoverProject.urgency} urgency`} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                    {hoverProject.dueDate && (
                      <Chip label={formatDue(hoverProject.dueDate)} size="small" color="warning" variant="outlined" />
                    )}
                    {hoverProject.totalTaskCount !== undefined && (
                      <Chip label={`${hoverProject.totalTaskCount} tasks`} size="small" variant="outlined" />
                    )}
                    <Chip label={hoverProject.status} size="small" variant="outlined" />
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
