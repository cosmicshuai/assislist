// theme.ts — MUI theme with Material 3 color roles
import { createTheme, type Theme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    surfaceContainerLowest: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    errorContainer: string;
    onErrorContainer: string;
    warningContainer: string;
    onWarningContainer: string;
    successContainer: string;
    onSuccessContainer: string;
  }
  interface PaletteOptions {
    surfaceContainerLowest?: string;
    surfaceContainerLow?: string;
    surfaceContainer?: string;
    surfaceContainerHigh?: string;
    surfaceContainerHighest?: string;
    primaryContainer?: string;
    onPrimaryContainer?: string;
    secondaryContainer?: string;
    onSecondaryContainer?: string;
    tertiaryContainer?: string;
    onTertiaryContainer?: string;
    errorContainer?: string;
    onErrorContainer?: string;
    warningContainer?: string;
    onWarningContainer?: string;
    successContainer?: string;
    onSuccessContainer?: string;
  }
}

const dark = {
  mode: 'dark' as const,
  primary: { main: '#cfe9ff' },
  secondary: { main: '#b6c9f0' },
  background: { default: '#0b1220', paper: '#111a2e' },
  text: { primary: '#e2e8f0', secondary: '#94a3b8' },
  divider: 'rgba(148,163,184,0.16)',
  success: { main: '#a5f3b8' },
  warning: { main: '#fde68a' },
  error: { main: '#fda4af' },
  surfaceContainerLowest: '#0a0f1a',
  surfaceContainerLow: '#0e1526',
  surfaceContainer: '#131c30',
  surfaceContainerHigh: '#1a2439',
  surfaceContainerHighest: '#212c43',
  primaryContainer: '#20385c',
  onPrimaryContainer: '#d8e9ff',
  secondaryContainer: '#2b2f45',
  onSecondaryContainer: '#d8def2',
  tertiaryContainer: '#3a2b4d',
  onTertiaryContainer: '#ecddfc',
  errorContainer: '#4a1520',
  onErrorContainer: '#ffd9de',
  warningContainer: '#3a2c00',
  onWarningContainer: '#ffe9b3',
  successContainer: '#0f2e1a',
  onSuccessContainer: '#c0f2cd',
};

const light = {
  mode: 'light' as const,
  primary: { main: '#1565c0' },
  secondary: { main: '#5b6f9e' },
  background: { default: '#f6f7fb', paper: '#ffffff' },
  text: { primary: '#0f172a', secondary: '#475569' },
  divider: 'rgba(15,23,42,0.12)',
  success: { main: '#15803d' },
  warning: { main: '#b45309' },
  error: { main: '#dc2626' },
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f4f8',
  surfaceContainer: '#e9edf4',
  surfaceContainerHigh: '#e2e7ef',
  surfaceContainerHighest: '#d9dfe9',
  primaryContainer: '#dbeafe',
  onPrimaryContainer: '#1e3a8a',
  secondaryContainer: '#e0e7ff',
  onSecondaryContainer: '#3730a3',
  tertiaryContainer: '#ede9fe',
  onTertiaryContainer: '#5b21b6',
  errorContainer: '#ffe4e6',
  onErrorContainer: '#9f1239',
  warningContainer: '#ffedd5',
  onWarningContainer: '#9a3412',
  successContainer: '#dcfce7',
  onSuccessContainer: '#166534',
};

export const getTheme = (mode: 'light' | 'dark'): Theme => {
  const tokens = mode === 'dark' ? dark : light;
  return createTheme({
    palette: tokens as never,
    shape: { borderRadius: 12 },
    typography: {
      fontFamily:
        '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      h5: { fontWeight: 650, letterSpacing: '-0.01em' },
      h6: { fontWeight: 650, letterSpacing: '-0.01em' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 24,
            border: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 999 },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: { borderRadius: 18 },
        },
      },
    },
  });
};
