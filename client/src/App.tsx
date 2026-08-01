// App.tsx — view switch: Home (suggestions) ↔ Board ↔ project detail
import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { Home } from './components/Home';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectDetail } from './components/ProjectDetail';
import { useTheme } from './context/ThemeContext';

type View = 'home' | 'board';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [projectId, setProjectId] = useState<number | null>(null);
  const { theme, toggle } = useTheme();

  const openProject = (id: number) => setProjectId(id);
  const backHome = () => { setProjectId(null); setView('home'); };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{ borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(8px)' }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <CheckCircleOutlineIcon color="primary" />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Todo System
          </Typography>
          {projectId === null && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_, v) => v && setView(v)}
              sx={{ mr: 1 }}
            >
              <ToggleButton value="home" aria-label="Home">
                <HomeIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="board" aria-label="Board">
                <DashboardIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          )}
          <IconButton onClick={toggle} color="inherit" aria-label="Toggle theme">
            {theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, maxWidth: 1000, width: '100%', mx: 'auto' }}>
        {projectId !== null ? (
          <ProjectDetail projectId={projectId} onBack={backHome} />
        ) : view === 'home' ? (
          <Home onOpenProject={openProject} />
        ) : (
          <KanbanBoard onOpenProject={openProject} />
        )}
      </Box>
    </Box>
  );
}
