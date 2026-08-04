// components/ProjectPreview.tsx — the project's full context, on any input.
//
// The board used to show this only in a Popper opened by `onMouseEnter`, so on
// a phone — the app's primary target — the context, due date and status were
// simply unreachable. The content is the same either way; only the container
// changes with the pointer: a hover popover where hovering exists, a bottom
// sheet where it doesn't.
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Fade from '@mui/material/Fade';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import type { Project } from '../api/client';
import { formatDue } from '../lib/utils';
import { SourceTag } from './SourceTag';
import { DURATION } from '../theme/motion';

function PreviewBody({ project }: { project: Project }) {
  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="titleMedium" sx={{ fontWeight: 650, minWidth: 0 }}>
          {project.title}
        </Typography>
        <SourceTag source={project.source} />
      </Stack>
      {project.context ? (
        <Typography variant="bodyMedium" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
          {project.context}
        </Typography>
      ) : (
        <Typography variant="bodyMedium" color="text.disabled" fontStyle="italic">
          No context
        </Typography>
      )}
      <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 0.75 }}>
        <Chip label={`${project.urgency} urgency`} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
        {project.dueDate && <Chip label={formatDue(project.dueDate)} size="small" color="warning" variant="outlined" />}
        {project.totalTaskCount !== undefined && (
          <Chip label={`${project.totalTaskCount} task${project.totalTaskCount === 1 ? '' : 's'}`} size="small" variant="outlined" />
        )}
        <Chip label={project.status} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
      </Stack>
    </>
  );
}

interface Props {
  project: Project | null;
  /** Present for the hover form; null forces the sheet. */
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onOpenProject: (id: number) => void;
}

export function ProjectPreview({ project, anchorEl, onClose, onOpenProject }: Props) {
  const muiTheme = useMuiTheme();
  // Matches the guard used to arm hover in the board, so the two can never
  // disagree about which affordance this device gets.
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)', { noSsr: true });

  if (!project) return null;

  if (canHover && anchorEl) {
    return (
      <Popper
        open
        anchorEl={anchorEl}
        placement="right-start"
        transition
        // Keep the card inside the viewport instead of running off the edge
        // for tiles in the last column.
        modifiers={[
          { name: 'preventOverflow', options: { padding: 8 } },
          { name: 'flip', options: { fallbackPlacements: ['left-start', 'bottom'] } },
        ]}
        sx={{ zIndex: muiTheme.zIndex.tooltip }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={DURATION.short3}>
            <Card elevation={3} sx={{ width: 300, p: 2, m: 1, bgcolor: 'surfaceContainerHigh' }}>
              <PreviewBody project={project} />
            </Card>
          </Fade>
        )}
      </Popper>
    );
  }

  // Touch: an M3 bottom sheet. Anchored to the bottom edge so it sits under
  // the thumb rather than in the middle of the screen.
  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            m: 0,
            width: '100%',
            maxWidth: '100%',
            borderRadius: '28px 28px 0 0',
            pb: 'env(safe-area-inset-bottom, 0px)',
          },
        },
      }}
    >
      <Box sx={{ p: 3, pt: 1.5 }}>
        {/* Drag handle — the affordance that says "this sheet dismisses". */}
        <Box sx={{ width: 32, height: 4, borderRadius: 2, bgcolor: 'outlineVariant', mx: 'auto', mb: 2 }} />
        <PreviewBody project={project} />
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="contained"
            onClick={() => { onClose(); onOpenProject(project.id); }}
          >
            Open project
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
