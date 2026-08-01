// App.tsx — root view switch: Kanban board ↔ project detail
import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { KanbanBoard } from './components/KanbanBoard';
import { ProjectDetail } from './components/ProjectDetail';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const [projectId, setProjectId] = useState<number | null>(null);
  const { theme, toggle } = useTheme();

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
          <IconButton onClick={toggle} color="inherit" aria-label="Toggle theme">
            {theme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, maxWidth: 1400, width: '100%', mx: 'auto' }}>
        {projectId === null ? (
          <KanbanBoard onOpenProject={setProjectId} />
        ) : (
          <ProjectDetail projectId={projectId} onBack={() => setProjectId(null)} />
        )}
      </Box>
    </Box>
  );
}
