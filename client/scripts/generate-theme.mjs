// scripts/generate-theme.mjs — derive the Material 3 colour scheme from one
// seed and write it to src/theme/tokens.ts.
//
//   npm run generate:theme
//
// The previous palette was hand-written hex values, so the tonal steps were
// uneven, light and dark were not related to each other, and nothing checked
// that text on a container was actually readable. Generating the scheme fixes
// all three: tones come from one perceptually even ramp, both modes are
// sampled from the same palettes, and this script fails if any foreground /
// background pair the UI relies on falls below WCAG AA.
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, seedToHueChroma, tonalPalette } from './lib/color.mjs';

const SEED = '#4C5FD7'; // indigo — calm, high-chroma enough for a vivid primary

const { hue, chroma } = seedToHueChroma(SEED);

// Standard Material 3 palette recipe: hues offset from the seed, chroma fixed
// per role so accents stay distinguishable and neutrals stay near-grey.
const palettes = {
  primary: tonalPalette({ hue, chroma: Math.max(chroma, 48) }),
  secondary: tonalPalette({ hue, chroma: 16 }),
  tertiary: tonalPalette({ hue: (hue + 60) % 360, chroma: 24 }),
  neutral: tonalPalette({ hue, chroma: 4 }),
  neutralVariant: tonalPalette({ hue, chroma: 8 }),
  error: tonalPalette({ hue: 25, chroma: 84 }),
  success: tonalPalette({ hue: 145, chroma: 48 }),
  warning: tonalPalette({ hue: 75, chroma: 60 }),
};

const P = palettes.primary;
const S = palettes.secondary;
const T = palettes.tertiary;
const N = palettes.neutral;
const NV = palettes.neutralVariant;
const E = palettes.error;
const OK = palettes.success;
const W = palettes.warning;

const light = {
  primary: P(40), onPrimary: P(100), primaryContainer: P(90), onPrimaryContainer: P(10),
  secondary: S(40), onSecondary: S(100), secondaryContainer: S(90), onSecondaryContainer: S(10),
  tertiary: T(40), onTertiary: T(100), tertiaryContainer: T(90), onTertiaryContainer: T(10),
  error: E(40), onError: E(100), errorContainer: E(90), onErrorContainer: E(10),
  success: OK(40), onSuccess: OK(100), successContainer: OK(90), onSuccessContainer: OK(10),
  warning: W(40), onWarning: W(100), warningContainer: W(90), onWarningContainer: W(10),
  background: N(98), onBackground: N(10),
  surface: N(98), onSurface: N(10),
  surfaceVariant: NV(90), onSurfaceVariant: NV(30),
  outline: NV(50), outlineVariant: NV(80),
  surfaceContainerLowest: N(100),
  surfaceContainerLow: N(96),
  surfaceContainer: N(94),
  surfaceContainerHigh: N(92),
  surfaceContainerHighest: N(90),
  inverseSurface: N(20), inverseOnSurface: N(95), inversePrimary: P(80),
  scrim: N(0),
};

const dark = {
  primary: P(80), onPrimary: P(20), primaryContainer: P(30), onPrimaryContainer: P(90),
  secondary: S(80), onSecondary: S(20), secondaryContainer: S(30), onSecondaryContainer: S(90),
  tertiary: T(80), onTertiary: T(20), tertiaryContainer: T(30), onTertiaryContainer: T(90),
  error: E(80), onError: E(20), errorContainer: E(30), onErrorContainer: E(90),
  success: OK(80), onSuccess: OK(20), successContainer: OK(30), onSuccessContainer: OK(90),
  warning: W(80), onWarning: W(20), warningContainer: W(30), onWarningContainer: W(90),
  background: N(6), onBackground: N(90),
  surface: N(6), onSurface: N(90),
  surfaceVariant: NV(30), onSurfaceVariant: NV(80),
  outline: NV(60), outlineVariant: NV(30),
  surfaceContainerLowest: N(4),
  surfaceContainerLow: N(10),
  surfaceContainer: N(12),
  surfaceContainerHigh: N(17),
  surfaceContainerHighest: N(22),
  inverseSurface: N(90), inverseOnSurface: N(20), inversePrimary: P(40),
  scrim: N(0),
};

// Every foreground/background pair the UI actually renders. AA is 4.5:1 for
// body text; 3:1 is the floor for large text and non-text UI boundaries.
const PAIRS = [
  ['onPrimary', 'primary', 4.5],
  ['onPrimaryContainer', 'primaryContainer', 4.5],
  ['onSecondary', 'secondary', 4.5],
  ['onSecondaryContainer', 'secondaryContainer', 4.5],
  ['onTertiary', 'tertiary', 4.5],
  ['onTertiaryContainer', 'tertiaryContainer', 4.5],
  ['onError', 'error', 4.5],
  ['onErrorContainer', 'errorContainer', 4.5],
  ['onSuccess', 'success', 4.5],
  ['onSuccessContainer', 'successContainer', 4.5],
  ['onWarning', 'warning', 4.5],
  ['onWarningContainer', 'warningContainer', 4.5],
  ['onSurface', 'surface', 4.5],
  ['onSurface', 'surfaceContainerHighest', 4.5],
  ['onSurfaceVariant', 'surfaceVariant', 4.5],
  ['onSurfaceVariant', 'surfaceContainer', 4.5],
  ['onBackground', 'background', 4.5],
  ['inverseOnSurface', 'inverseSurface', 4.5],
  ['outline', 'surface', 3],
];

function check(scheme, mode) {
  const failures = [];
  for (const [fg, bg, min] of PAIRS) {
    const ratio = contrast(scheme[fg], scheme[bg]);
    if (ratio < min) {
      failures.push(`${mode}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1 (need ${min}:1)`);
    }
  }
  return failures;
}

const failures = [...check(light, 'light'), ...check(dark, 'dark')];
if (failures.length > 0) {
  console.error('Contrast check failed:');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

const serialize = (scheme) =>
  Object.entries(scheme).map(([k, v]) => `  ${k}: '${v}',`).join('\n');

const out = `// tokens.ts — GENERATED by scripts/generate-theme.mjs. Do not edit by hand.
//
// Material 3 colour scheme derived from the seed ${SEED}. Both modes are
// sampled from the same tonal palettes, and every foreground/background pair
// the UI renders is verified against WCAG AA by the generator.
//
// Regenerate with: npm run generate:theme

export const seed = '${SEED}';

export type ColorRole =
${Object.keys(light).map((k) => `  | '${k}'`).join('\n')};

export type ColorScheme = Record<ColorRole, string>;

export const lightScheme: ColorScheme = {
${serialize(light)}
};

export const darkScheme: ColorScheme = {
${serialize(dark)}
};
`;

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../src/theme/tokens.ts');
writeFileSync(target, out);

// The icon generator and the HTML template need the same colours, and they run
// outside the TypeScript build — emit a plain-JS twin so there is still exactly
// one source of truth.
writeFileSync(
  resolve(here, 'lib/scheme.mjs'),
  `// GENERATED by scripts/generate-theme.mjs. Do not edit by hand.\n`
  + `export const seed = '${SEED}';\n`
  + `export const lightScheme = ${JSON.stringify(light, null, 2)};\n`
  + `export const darkScheme = ${JSON.stringify(dark, null, 2)};\n`,
);

// Report the tightest margin against each pair's own requirement, not the
// lowest absolute ratio — a 3:1 pair at 4.26:1 is comfortable, not marginal.
const tightest = PAIRS.reduce((acc, [fg, bg, min]) => {
  const ratio = Math.min(contrast(light[fg], light[bg]), contrast(dark[fg], dark[bg]));
  return ratio / min < acc.margin ? { margin: ratio / min, fg, bg, ratio, min } : acc;
}, { margin: Infinity });

console.log(`✅ wrote ${target}`);
console.log(`   seed ${SEED} → hue ${hue.toFixed(1)}°, chroma ${chroma.toFixed(1)}`);
console.log(`   ${PAIRS.length} pairs × 2 modes pass WCAG AA`);
console.log(`   tightest: ${tightest.fg} on ${tightest.bg} = ${tightest.ratio.toFixed(2)}:1 (needs ${tightest.min}:1)`);
