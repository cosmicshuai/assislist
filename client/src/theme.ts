// theme.ts — MUI theme with light/dark palettes
import { createTheme, type Theme } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark'): Theme =>
  createTheme({
    palette: {
      mode,
      primary: { main: mode === 'dark' ? '#22d3ee' : '#0e7490' },
      secondary: { main: mode === 'dark' ? '#a78bfa' : '#7c3aed' },
      background: {
        default: mode === 'dark' ? '#0b1220' : '#f1f5f9',
        paper: mode === 'dark' ? '#111a2e' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#e2e8f0' : '#0f172a',
        secondary: mode === 'dark' ? '#94a3b8' : '#475569',
      },
      divider: mode === 'dark' ? 'rgba(148,163,184,0.16)' : 'rgba(15,23,42,0.12)',
      success: { main: '#10b981' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily:
        '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none' },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
    },
  });
