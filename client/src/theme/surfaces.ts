// theme/surfaces.ts — shared sx for interactive surfaces.
//
// M3 signals "you can press this" with a *state layer*: a translucent film of
// the container's content colour, laid over the container at a fixed opacity.
// The container's own tone never changes and no shadow is involved, which is
// what makes the same rule read correctly in both light and dark.
//
// This replaces the `transform: translateY(-3px); boxShadow: 8` hover the
// cards used to carry — that contradicted the tonal-elevation model the
// palette is built on, and the lift caused a reflow-free but visually jumpy
// grid on hover.
import type { SxProps, Theme } from '@mui/material/styles';
import { DURATION, STATE_LAYER_OPACITY, transition } from './motion';

/**
 * A card/tile the user can activate.
 *
 * `hover: hover` guards the hover rule so touch devices — where :hover sticks
 * after a tap — don't leave a tile shaded until something else is pressed.
 */
export const interactiveSurface = (base: string = 'surfaceContainer'): SxProps<Theme> => ({
  position: 'relative',
  bgcolor: base,
  transition: transition(['background-color'], DURATION.short4),
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    pointerEvents: 'none',
    bgcolor: 'onSurface',
    opacity: 0,
    transition: transition(['opacity'], DURATION.short4),
  },
  '@media (hover: hover)': {
    '&:hover::after': { opacity: STATE_LAYER_OPACITY.hover },
  },
  '&:has(:focus-visible)::after': { opacity: STATE_LAYER_OPACITY.focus },
  '&:active::after': { opacity: STATE_LAYER_OPACITY.pressed },
});
