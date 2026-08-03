// AuthGate.tsx — unlock screen + session state for the whole app.
//
// The bundle ships no credential (see api/client.ts). On first load the app
// asks the server whether this browser already holds a session cookie; if not
// it shows the unlock screen, which exchanges the user token for one.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { auth, setUnauthorizedHandler } from '../api/client';

interface AuthValue {
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({ logout: async () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

type Status = 'checking' | 'locked' | 'unlocked';

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    auth
      .session()
      .then((s) => { if (!cancelled) setStatus(s.authenticated ? 'unlocked' : 'locked'); })
      .catch(() => { if (!cancelled) setStatus('locked'); });
    return () => { cancelled = true; };
  }, []);

  // Re-lock if the session expires while the app is open.
  useEffect(() => {
    setUnauthorizedHandler(() => setStatus('locked'));
    return () => setUnauthorizedHandler(null);
  }, []);

  const logout = useCallback(async () => {
    try { await auth.logout(); } finally { setStatus('locked'); setToken(''); }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await auth.login(token.trim());
      setToken('');
      setStatus('unlocked');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlock');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'checking') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress aria-label="Checking session" />
      </Box>
    );
  }

  if (status === 'locked') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
        <Card sx={{ p: 4, width: '100%', maxWidth: 420, bgcolor: 'surfaceContainerLow' }}>
          <Stack spacing={3} component="form" onSubmit={submit}>
            <Stack spacing={1.5} alignItems="center" textAlign="center">
              <Box
                sx={{
                  width: 56, height: 56, borderRadius: '50%',
                  display: 'grid', placeItems: 'center',
                  bgcolor: 'primaryContainer', color: 'onPrimaryContainer',
                }}
              >
                <LockOutlinedIcon />
              </Box>
              <Typography variant="h5">Unlock AssisList</Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your <code>TODO_API_TOKEN</code>. It is exchanged for a
                session cookie and never stored in the page.
              </Typography>
            </Stack>

            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="API token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoFocus
              autoComplete="current-password"
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting || token.trim().length === 0}
            >
              {submitting ? 'Unlocking…' : 'Unlock'}
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }

  return <AuthContext.Provider value={{ logout }}>{children}</AuthContext.Provider>;
}
