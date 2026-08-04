// context/SnackbarContext.tsx — the app's single feedback surface.
//
// Replaces window.alert/confirm. Two jobs:
//   notify(msg)                     — something happened, or failed
//   notifyUndo(msg, commit, undo)   — something happened and is reversible
//
// The undo form is a *deferred* action, not a compensating one: the caller's
// `commit` runs when the snackbar closes without being undone. The API has no
// restore endpoint for deletes, so the only honest undo is to not have sent
// the request yet. Callers remove the row optimistically and let this decide
// whether it ever reaches the server.
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import Snackbar from '@mui/material/Snackbar';
import SnackbarContent from '@mui/material/SnackbarContent';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import Box from '@mui/material/Box';
import { DURATION, EASING } from '../theme/motion';

const UNDO_WINDOW_MS = 6000;
const PLAIN_MS = 4000;

interface Message {
  key: number;
  text: string;
  error?: boolean;
  /** Runs if the window closes without an undo. */
  commit?: () => void | Promise<void>;
  /** Runs instead of commit when the user hits UNDO. */
  undo?: () => void;
}

interface SnackbarCtx {
  /** Transient message. Pass `error` to style it as a failure. */
  notify: (text: string, opts?: { error?: boolean }) => void;
  /** Reversible action: `commit` fires on timeout, `undo` fires on UNDO. */
  notifyUndo: (text: string, commit: () => void | Promise<void>, undo?: () => void) => void;
  /** Convenience for catch blocks — accepts anything thrown. */
  notifyError: (e: unknown, fallback?: string) => void;
}

const Ctx = createContext<SnackbarCtx>({
  notify: () => {},
  notifyUndo: () => {},
  notifyError: () => {},
});

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Message[]>([]);
  const [open, setOpen] = useState(false);
  const current = queue[0];
  const nextKey = useRef(0);
  // Guards the commit against running twice (timeout racing an explicit close).
  const settled = useRef<Set<number>>(new Set());

  const push = useCallback((m: Omit<Message, 'key'>) => {
    setQueue((q) => [...q, { ...m, key: nextKey.current++ }]);
  }, []);

  const notify = useCallback(
    (text: string, opts?: { error?: boolean }) => push({ text, error: opts?.error }),
    [push],
  );

  const notifyUndo = useCallback(
    (text: string, commit: () => void | Promise<void>, undo?: () => void) =>
      push({ text, commit, undo }),
    [push],
  );

  const notifyError = useCallback(
    (e: unknown, fallback = 'Something went wrong') =>
      push({ text: e instanceof Error ? e.message : fallback, error: true }),
    [push],
  );

  // Open whenever a message reaches the head of the queue.
  useEffect(() => {
    if (current && !open) setOpen(true);
  }, [current, open]);

  const settle = useCallback((message: Message, undone: boolean) => {
    if (settled.current.has(message.key)) return;
    settled.current.add(message.key);
    if (undone) message.undo?.();
    else void message.commit?.();
  }, []);

  const close = useCallback(
    (undone: boolean) => {
      if (current) settle(current, undone);
      setOpen(false);
    },
    [current, settle],
  );

  // Drop the settled message once its exit transition has played.
  const onExited = useCallback(() => {
    setQueue((q) => q.slice(1));
  }, []);

  // A pending commit must not be lost if the tab closes mid-window.
  useEffect(() => {
    const flush = () => queue.forEach((m) => settle(m, false));
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [queue, settle]);

  const value = useMemo(
    () => ({ notify, notifyUndo, notifyError }),
    [notify, notifyUndo, notifyError],
  );

  const undoable = Boolean(current?.commit);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Snackbar
        key={current?.key}
        open={open}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        autoHideDuration={undoable ? UNDO_WINDOW_MS : PLAIN_MS}
        onClose={(_, reason) => {
          // Clicking the page should not silently cancel a pending commit.
          if (reason === 'clickaway') return;
          close(false);
        }}
        slotProps={{ transition: { onExited } }}
        sx={{
          // Clear of the bottom navigation bar and the FAB on mobile.
          bottom: { xs: 'calc(80px + env(safe-area-inset-bottom, 0px))', sm: 24 },
        }}
      >
        <SnackbarContent
          message={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {current?.error && <ErrorOutlineIcon fontSize="small" />}
              <span>{current?.text}</span>
            </Box>
          }
          action={
            <>
              {undoable && (
                <Button
                  size="small"
                  onClick={() => close(true)}
                  sx={{ color: 'inversePrimary', fontWeight: 600 }}
                >
                  Undo
                </Button>
              )}
              <IconButton
                size="small"
                aria-label="Dismiss"
                onClick={() => close(false)}
                sx={{ color: 'inverseOnSurface' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          }
          sx={{
            // M3 snackbars sit on the inverse surface so they read as system
            // feedback rather than as another card in the page.
            bgcolor: 'inverseSurface',
            color: 'inverseOnSurface',
            borderRadius: 1,
            boxShadow: 3,
            transition: `all ${DURATION.medium2}ms ${EASING.emphasizedDecelerate}`,
          }}
        />
      </Snackbar>
    </Ctx.Provider>
  );
}

export function useSnackbar() {
  return useContext(Ctx);
}
