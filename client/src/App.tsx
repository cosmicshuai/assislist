// App.tsx — view switch: Home (suggestions) ↔ Board ↔ project detail
import { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from './components/AuthGate';
import { Home } from './components/Home';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectDetail } from './components/ProjectDetail';
import { BottomNav, BOTTOM_NAV_HEIGHT, type View } from './components/BottomNav';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [projectId, setProjectId] = useState<number | null>(null);
  const { theme, toggle } = useTheme();
  const { logout } = useAuth();

  // M3 top app bar: flat on the background until content passes beneath it,
  // then raised to a container tone. Tone, not shadow — the palette expresses
  // elevation tonally, and a shadow here would contradict that.
  const scrolled = useScrollTrigger({ disableHysteresis: true, threshold: 0 });

  const openProject = (id: number) => setProjectId(id);
  // Unwind the history entry rather than just clearing state, so the in-app
  // back button and the browser's stay in step. The popstate handler is what
  // actually clears projectId, for both paths.
  const backHome = () => window.history.back();

  // Hardware/browser back should leave a project rather than exit the app —
  // in an installed PWA there is no browser chrome to go back with.
  useEffect(() => {
    if (projectId === null) return;
    window.history.pushState({ project: projectId }, '');
    const onPop = () => setProjectId(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [projectId]);

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: scrolled ? 'surfaceContainer' : 'background.default',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: scrolled ? 'divider' : 'transparent',
          // The page runs under the status bar and the notch now, so the bar
          // pads itself out of their way. Padding rather than margin: the bar's
          // own tone is what fills the status-bar strip.
          pt: 'env(safe-area-inset-top, 0px)',
          pl: 'env(safe-area-inset-left, 0px)',
          pr: 'env(safe-area-inset-right, 0px)',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <CheckCircleOutlineIcon color="primary" />
          <Typography variant="titleLarge" component="div" sx={{ flexGrow: 1 }}>
            AssisList
          </Typography>
          {projectId === null && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_, v) => v && setView(v)}
              // The bottom navigation bar owns this on mobile.
              sx={{ mr: 1, display: { xs: 'none', sm: 'flex' } }}
            >
              <ToggleButton value="home" aria-label="Home">
                <HomeIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="board" aria-label="Board">
                <DashboardIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          )}
          <Tooltip title={theme === 'dark' ? 'Light theme' : 'Dark theme'}>
            <IconButton onClick={toggle} color="inherit" aria-label="Toggle theme">
              {theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Lock">
            <IconButton onClick={logout} color="inherit" aria-label="Lock">
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          maxWidth: 1000,
          width: '100%',
          mx: 'auto',
          // Landscape on a notched phone puts the notch beside the content.
          // max() keeps the usual gutter everywhere it is the larger of the two.
          pl: { xs: 'max(16px, env(safe-area-inset-left, 0px))', md: 'max(24px, env(safe-area-inset-left, 0px))' },
          pr: { xs: 'max(16px, env(safe-area-inset-right, 0px))', md: 'max(24px, env(safe-area-inset-right, 0px))' },
          // Clear the fixed navigation bar on mobile so the last card is not
          // trapped underneath it.
          pb: { xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 16px)`, sm: 3 },
        }}
      >
        {projectId !== null ? (
          <ProjectDetail projectId={projectId} onBack={backHome} />
        ) : view === 'home' ? (
          <Home onOpenProject={openProject} />
        ) : (
          <KanbanBoard onOpenProject={openProject} />
        )}
      </Box>

      {projectId === null && <BottomNav view={view} onChange={setView} />}
    </Box>
  );
}
