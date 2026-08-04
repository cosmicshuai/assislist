// components/Skeletons.tsx — placeholders shaped like the content they stand in for.
//
// The screens used to render a centred CircularProgress while loading, which
// collapsed the page to a single spinner and then snapped back to a full
// layout. Skeletons hold the same space the real cards will occupy, so the
// first paint and the loaded state have the same geometry.
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

function TileSkeleton() {
  return (
    <Card elevation={0} sx={{ bgcolor: 'surfaceContainer' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="65%" height={24} />
            <Skeleton variant="text" width="90%" height={18} />
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }}>
          <Skeleton variant="rounded" width={72} height={24} />
          <Skeleton variant="rounded" width={64} height={24} />
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Stacked tiles — Home's two recommendation lists. */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Stack spacing={1.5} aria-hidden>
      {Array.from({ length: count }, (_, i) => <TileSkeleton key={i} />)}
    </Stack>
  );
}

/** The board's responsive tile grid. */
export function BoardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
        gap: 1.5,
      }}
    >
      {Array.from({ length: count }, (_, i) => <TileSkeleton key={i} />)}
    </Box>
  );
}

/** Project detail: header panel then a task list. */
export function DetailSkeleton() {
  return (
    <Box aria-hidden>
      <Card elevation={0} sx={{ bgcolor: 'surfaceContainerLow', p: 3, mb: 2 }}>
        <Skeleton variant="text" width="45%" height={34} />
        <Skeleton variant="text" width="80%" height={20} />
        <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }}>
          <Skeleton variant="rounded" width={72} height={24} />
          <Skeleton variant="rounded" width={96} height={24} />
        </Stack>
      </Card>
      <ListSkeleton count={4} />
    </Box>
  );
}

/**
 * Announces loading to assistive tech, which the skeletons themselves cannot
 * — they are aria-hidden precisely so a screen reader isn't read a wall of
 * placeholder boxes.
 */
export function LoadingAnnouncer({ label }: { label: string }) {
  return (
    <Box role="status" aria-live="polite" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
      {label}
    </Box>
  );
}
