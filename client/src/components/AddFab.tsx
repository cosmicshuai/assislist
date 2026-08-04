// components/AddFab.tsx — Material 3 speed-dial: hover (1s) or tap opens
// extended-FAB actions ("New project" / "New task") with staggered entrance.
import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Grow from '@mui/material/Grow';
import Stack from '@mui/material/Stack';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { BOTTOM_NAV_HEIGHT } from './BottomNav';
import { DURATION, EASING, transition } from '../theme/motion';

interface Props {
  onAddProject: () => void;
  onAddTask: () => void;
}

// Long enough not to fire while the pointer is merely crossing the corner,
// short enough to feel like a hint rather than a wait. The old 1000ms read as
// unresponsive: users clicked before it ever triggered.
const HOVER_OPEN_MS = 400;
const ENTER_MS = DURATION.medium1;
const EXIT_MS = DURATION.short3;

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
  // Which gesture opened the menu. Hover-opened menus close when the pointer
  // leaves; tapped ones stay until dismissed. The old code claimed to do this
  // in a comment but closed on mouseleave either way, so on a hybrid device a
  // deliberate tap could be undone by an incidental pointer move.
  const openedByHover = useRef(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  const clearTimers = () => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    if (exitTimer.current) { clearTimeout(exitTimer.current); exitTimer.current = null; }
  };

  const openMenu = (viaHover: boolean) => {
    clearTimers();
    openedByHover.current = viaHover;
    setMounted(true);
    requestAnimationFrame(() => setOpen(true));
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    clearTimers();
    setOpen(false);
    exitTimer.current = setTimeout(() => setMounted(false), EXIT_MS);
    if (restoreFocus) fabRef.current?.focus();
  };

  const handleMouseEnter = () => {
    if (open) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => openMenu(true), HOVER_OPEN_MS);
  };

  const handleMouseLeave = () => {
    if (open) {
      if (openedByHover.current) closeMenu();
    } else if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const handleClick = () => {
    if (open) closeMenu();
    else openMenu(false);
  };

  // Escape closes the menu and returns focus to the FAB, so keyboard users
  // are not stranded inside a dismissed overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeMenu({ restoreFocus: true }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => clearTimers, []);

  const runAction = (action: Action) => {
    closeMenu();
    action.onClick();
  };

  const actions: Action[] = [
    { key: 'project', icon: <FolderOpenIcon />, label: 'New project', onClick: onAddProject },
    { key: 'task', icon: <TaskAltIcon />, label: 'New task', onClick: onAddTask },
  ];

  return (
    <>
      {/* Click-away scrim (transparent) — only while open */}
      {mounted && (
        <Box
          onClick={() => closeMenu()}
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1099,
            bgcolor: open ? 'rgba(0,0,0,0.32)' : 'transparent',
            transition: transition(['background-color'], DURATION.short4),
          }}
        />
      )}

      <Stack
        direction="column"
        alignItems="flex-end"
        spacing={1.5}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          position: 'fixed',
          right: { xs: 16, sm: 24 },
          // Sit above the mobile navigation bar rather than behind it.
          bottom: {
            xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 16px)`,
            sm: 24,
          },
          zIndex: 1100,
        }}
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
                size="large"
                onClick={() => runAction(action)}
                aria-label={action.label}
                sx={{
                  bgcolor: 'primaryContainer',
                  color: 'onPrimaryContainer',
                  borderRadius: '22px',
                  textTransform: 'none',
                  fontWeight: 550,
                  fontSize: '1.3125rem',
                  height: 72,
                  px: 3.25,
                  boxShadow: 3,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: transition(['box-shadow'], DURATION.short4),
                  // M3 state layer rather than a scale transform: the button
                  // shades, it does not grow. Growing a 72px control on hover
                  // nudged the whole stack and made the labels jitter.
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'onPrimaryContainer',
                    opacity: 0,
                    transition: transition(['opacity'], DURATION.short4),
                  },
                  '&:hover': { bgcolor: 'primaryContainer', boxShadow: 4 },
                  '@media (hover: hover)': { '&:hover::after': { opacity: 0.08 } },
                  '&:focus-visible::after': { opacity: 0.1 },
                }}
              >
                <Box component="span" sx={{ display: 'inline-flex', lineHeight: 1, '& svg': { fontSize: '1.875rem' } }}>{action.icon}</Box>
                <Box component="span" sx={{ ml: 1.25 }}>{action.label}</Box>
              </Fab>
            </Grow>
          ))}

        {/* Main FAB — icon rotates into × when open */}
        <Fab
          ref={fabRef}
          color="primary"
          aria-label={open ? 'Close add menu' : 'Add'}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={handleClick}
          sx={{
            width: 84,
            height: 84,
            borderRadius: '26px',
            transition: transition(['box-shadow'], DURATION.short4),
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              transition: `transform ${DURATION.medium1}ms ${EASING.emphasized}`,
              transform: open ? 'rotate(135deg)' : 'rotate(0deg)',
              '& svg': { fontSize: '2.25rem' },
            }}
          >
            <AddIcon />
          </Box>
        </Fab>
      </Stack>
    </>
  );
}
