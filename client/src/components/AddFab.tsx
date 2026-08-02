// components/AddFab.tsx — Material 3 speed-dial: hover (1s) or tap opens
// extended-FAB actions ("New project" / "New task") with staggered entrance.
import { useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Grow from '@mui/material/Grow';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

interface Props {
  onAddProject: () => void;
  onAddTask: () => void;
}

const HOVER_OPEN_MS = 1000; // hold hover on the FAB this long to open without clicking
const ENTER_MS = 220;
const EXIT_MS = 160;

interface Action {
  key: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

export function AddFab({ onAddProject, onAddTask }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    if (exitTimer.current) { clearTimeout(exitTimer.current); exitTimer.current = null; }
  };

  const openMenu = () => {
    clearTimers();
    setMounted(true);
    requestAnimationFrame(() => setOpen(true));
  };

  const closeMenu = () => {
    clearTimers();
    setOpen(false);
    exitTimer.current = setTimeout(() => setMounted(false), EXIT_MS);
  };

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(openMenu, HOVER_OPEN_MS);
  };

  const handleMouseLeave = () => {
    // Only auto-close via hover; a deliberate click (touch) keeps it open
    if (open) closeMenu();
    else if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
  };

  const handleClick = () => {
    if (open) closeMenu();
    else openMenu();
  };

  const runAction = (action: Action) => {
    closeMenu();
    action.onClick();
  };

  const actions: Action[] = [
    { key: 'project', icon: <FolderOpenIcon fontSize="small" />, label: 'New project', onClick: onAddProject },
    { key: 'task', icon: <TaskAltIcon fontSize="small" />, label: 'New task', onClick: onAddTask },
  ];

  return (
    <>
      {/* Click-away scrim (transparent) — only while open */}
      {mounted && (
        <Box
          onClick={closeMenu}
          sx={{ position: 'fixed', inset: 0, zIndex: 1099, bgcolor: open ? 'rgba(0,0,0,0.18)' : 'transparent', transition: 'background-color 0.2s' }}
        />
      )}

      <Stack
        direction="column"
        alignItems="flex-end"
        spacing={1}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1100 }}
      >
        {/* Action extended-FABs, stacked above the main FAB */}
        {mounted &&
          actions.map((action, i) => (
            <Grow
              key={action.key}
              in={open}
              timeout={{ enter: ENTER_MS, exit: EXIT_MS }}
              style={{ transformOrigin: 'bottom right', transitionDelay: open ? `${i * 55}ms` : '0ms' }}
            >
              <Fab
                variant="extended"
                size="medium"
                onClick={() => runAction(action)}
                aria-label={action.label}
                sx={{
                  bgcolor: 'surfaceContainerHigh',
                  color: 'onSurface',
                  borderRadius: '16px',
                  textTransform: 'none',
                  fontWeight: 550,
                  fontSize: '0.875rem',
                  boxShadow: 3,
                  '&:hover': { bgcolor: 'surfaceContainerHighest' },
                }}
              >
                {action.icon}
                <Box component="span" sx={{ ml: 0.75 }}>{action.label}</Box>
              </Fab>
            </Grow>
          ))}

        {/* Main FAB — icon rotates into × when open */}
        <Fab
          color="primary"
          aria-label="Add"
          aria-expanded={open}
          onClick={handleClick}
          sx={{
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': { transform: 'scale(1.04)' },
          }}
        >
          <Box
            component="span"
            sx={{ display: 'inline-flex', transition: 'transform 0.25s cubic-bezier(.2,.8,.4,1)', transform: open ? 'rotate(135deg)' : 'rotate(0deg)' }}
          >
            <AddIcon />
          </Box>
        </Fab>
      </Stack>
    </>
  );
}
