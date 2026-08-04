// theme/motion.ts — the Material 3 motion system: easing and duration tokens.
//
// M3 splits easing into "standard" (most transitions) and "emphasized" (the
// ones the user is meant to notice — a surface arriving, a FAB expanding).
// Each has accelerate/decelerate variants for one-way motion: things leaving
// the screen accelerate out, things entering decelerate in.
//
// Everything animated in this app pulls from here rather than inventing a
// cubic-bezier, so motion reads as one system instead of a dozen near-misses.

export const EASING = {
  /** Default for transitions that both begin and end on screen. */
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  /** Entering the screen. */
  standardDecelerate: 'cubic-bezier(0, 0, 0, 1)',
  /** Leaving the screen. */
  standardAccelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  /** Draws attention — use for the few moments that should feel deliberate. */
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
} as const;

/** M3 duration tokens, in milliseconds. */
export const DURATION = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  medium3: 350,
  medium4: 400,
  long1: 450,
  long2: 500,
} as const;

/**
 * Build a `transition` value from a property list.
 *
 *   transition(['background-color', 'box-shadow'], DURATION.short4)
 */
export function transition(
  properties: string[],
  duration: number = DURATION.short4,
  easing: string = EASING.standard,
): string {
  return properties.map((p) => `${p} ${duration}ms ${easing}`).join(', ');
}

/**
 * The state-layer overlay M3 uses instead of shadow to signal interactivity.
 * A translucent film of the *content* colour sits over the container; the
 * container's own tone never changes, so the same rule works in both schemes.
 *
 * Returns sx-shaped styles for an element that should respond to hover/focus.
 */
export const STATE_LAYER_OPACITY = { hover: 0.08, focus: 0.1, pressed: 0.1 } as const;
