// AuthGate.tsx — unlock screen + session state for the whole app.
//
// The bundle ships no credential (see api/client.ts). On first load the app
// asks the server whether this browser already holds a session cookie; if not
// it shows the unlock screen, which exchanges the user token for one.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Fade from '@mui/material/Fade';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { auth, setUnauthorizedHandler } from '../api/client';
import { DURATION, EASING } from '../theme/motion';

interface AuthValue {
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({ logout: async () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

type Status = 'checking' | 'locked' | 'unlocked';

// This screen owns the whole viewport, which on iOS now includes the status
// bar and the home indicator. Keep the card out from under both.
const safeArea = {
  pt: 'calc(24px + env(safe-area-inset-top, 0px))',
  pb: 'calc(24px + env(safe-area-inset-bottom, 0px))',
  pl: 'max(24px, env(safe-area-inset-left, 0px))',
  pr: 'max(24px, env(safe-area-inset-right, 0px))',
};

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('checking');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reveal, setReveal] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);

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
      // Keep the caret where the correction has to happen. Select the text so
      // a re-paste replaces it instead of appending to a wrong token.
      requestAnimationFrame(() => fieldRef.current?.select());
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'checking') {
    // A spinner here flashes for one request and then swaps to a card of a
    // different size. A card-shaped placeholder in the same position means the
    // unlock form fades in rather than jumping into place.
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3, ...safeArea }}>
        <Box role="status" aria-label="Checking session" sx={{ width: '100%', maxWidth: 420 }}>
          <Skeleton variant="rounded" height={332} sx={{ borderRadius: 7 }} />
        </Box>
      </Box>
    );
  }

  if (status === 'locked') {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3, ...safeArea }}>
        <Card
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 420,
            bgcolor: 'surfaceContainerLow',
            animation: `unlockIn ${DURATION.medium2}ms ${EASING.emphasizedDecelerate} both`,
            '@keyframes unlockIn': {
              from: { opacity: 0, transform: 'translateY(8px)' },
              to: { opacity: 1, transform: 'none' },
            },
          }}
        >
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
              <Typography variant="headlineSmall">Unlock AssisList</Typography>
              <Typography variant="bodyMedium" color="text.secondary">
                Paste your API token to unlock this device. The page never
                stores it — the server returns a session cookie instead.
              </Typography>
            </Stack>

            {/* An M3 error is a tonal container, not MUI's default banner. */}
            <Fade in={Boolean(error)} timeout={DURATION.short3} unmountOnExit>
              <Stack
                direction="row"
                spacing={1}
                alignItems="flex-start"
                role="alert"
                sx={{ bgcolor: 'errorContainer', color: 'onErrorContainer', p: 1.5, borderRadius: 3 }}
              >
                <ErrorOutlineIcon fontSize="small" sx={{ mt: '2px' }} />
                <Typography variant="bodyMedium">{error}</Typography>
              </Stack>
            </Fade>

            <TextField
              inputRef={fieldRef}
              label="API token"
              type={reveal ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoFocus
              autoComplete="current-password"
              name="assislist-api-token"
              fullWidth
              error={Boolean(error)}
              // Where the token actually lives, kept as a hint rather than as
              // the headline — the operator needs it, but "TODO_API_TOKEN" is
              // not a sentence to greet someone with.
              helperText={'TODO_API_TOKEN from your .env'}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setReveal((v) => !v)}
                        edge="end"
                        // A long random token is easy to mis-paste and
                        // impossible to check behind dots.
                        aria-label={reveal ? 'Hide token' : 'Show token'}
                      >
                        {reveal ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
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
