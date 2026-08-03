import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './components/AuthGate.tsx'
import { ThemeProvider, useTheme } from './context/ThemeContext.tsx'
import { getTheme } from './theme.ts'

function Root() {
  const { theme } = useTheme();
  return (
    <MuiThemeProvider theme={getTheme(theme)}>
      <CssBaseline />
      <AuthGate>
        <App />
      </AuthGate>
    </MuiThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </StrictMode>,
)
