// theme.ts — MUI theme built on the generated Material 3 colour scheme.
//
// Colour roles come from src/theme/tokens.ts (generated; see
// scripts/generate-theme.mjs). This file is where those roles become MUI
// theme: the M3 type scale, state layers, and tonal elevation.
import { alpha, createTheme, type Theme } from '@mui/material/styles';
import { darkScheme, lightScheme, type ColorScheme } from './theme/tokens';

// Roles MUI doesn't know about, declared so `bgcolor="surfaceContainer"` and
// friends type-check and resolve.
type ExtraRoles =
  | 'primaryContainer' | 'onPrimaryContainer'
  | 'secondaryContainer' | 'onSecondaryContainer'
  | 'tertiary' | 'onTertiary' | 'tertiaryContainer' | 'onTertiaryContainer'
  | 'errorContainer' | 'onErrorContainer'
  | 'successContainer' | 'onSuccessContainer'
  | 'warningContainer' | 'onWarningContainer'
  | 'surfaceVariant' | 'onSurfaceVariant'
  | 'surfaceContainerLowest' | 'surfaceContainerLow' | 'surfaceContainer'
  | 'surfaceContainerHigh' | 'surfaceContainerHighest'
  | 'outline' | 'outlineVariant'
  | 'inverseSurface' | 'inverseOnSurface' | 'inversePrimary' | 'scrim';

declare module '@mui/material/styles' {
  interface Palette extends Record<ExtraRoles, string> { }
  interface PaletteOptions extends Partial<Record<ExtraRoles, string>> { }

  interface TypographyVariants {
    displayLarge: React.CSSProperties;
    displayMedium: React.CSSProperties;
    displaySmall: React.CSSProperties;
    headlineLarge: React.CSSProperties;
    headlineMedium: React.CSSProperties;
    headlineSmall: React.CSSProperties;
    titleLarge: React.CSSProperties;
    titleMedium: React.CSSProperties;
    titleSmall: React.CSSProperties;
    bodyLarge: React.CSSProperties;
    bodyMedium: React.CSSProperties;
    bodySmall: React.CSSProperties;
    labelLarge: React.CSSProperties;
    labelMedium: React.CSSProperties;
    labelSmall: React.CSSProperties;
  }
  interface TypographyVariantsOptions extends Partial<TypographyVariants> { }
}

// The Material 3 type scale: size / line-height / weight / tracking, in the
// units the spec states them.
const type = {
  displayLarge: { fontSize: '3.5625rem', lineHeight: '4rem', fontWeight: 400, letterSpacing: '-0.015625rem' },
  displayMedium: { fontSize: '2.8125rem', lineHeight: '3.25rem', fontWeight: 400, letterSpacing: 0 },
  displaySmall: { fontSize: '2.25rem', lineHeight: '2.75rem', fontWeight: 400, letterSpacing: 0 },
  headlineLarge: { fontSize: '2rem', lineHeight: '2.5rem', fontWeight: 400, letterSpacing: 0 },
  headlineMedium: { fontSize: '1.75rem', lineHeight: '2.25rem', fontWeight: 400, letterSpacing: 0 },
  headlineSmall: { fontSize: '1.5rem', lineHeight: '2rem', fontWeight: 400, letterSpacing: 0 },
  titleLarge: { fontSize: '1.375rem', lineHeight: '1.75rem', fontWeight: 500, letterSpacing: 0 },
  titleMedium: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 500, letterSpacing: '0.009375rem' },
  titleSmall: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, letterSpacing: '0.00625rem' },
  bodyLarge: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: 400, letterSpacing: '0.03125rem' },
  bodyMedium: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 400, letterSpacing: '0.015625rem' },
  bodySmall: { fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 400, letterSpacing: '0.025rem' },
  labelLarge: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500, letterSpacing: '0.00625rem' },
  labelMedium: { fontSize: '0.75rem', lineHeight: '1rem', fontWeight: 500, letterSpacing: '0.03125rem' },
  labelSmall: { fontSize: '0.6875rem', lineHeight: '1rem', fontWeight: 500, letterSpacing: '0.03125rem' },
} as const;

// M3 state layer opacities.
const STATE = { hover: 0.08, focus: 0.12, pressed: 0.12, selected: 0.12 };

// M3 shape scale (dp).
const SHAPE = { extraSmall: 4, small: 8, medium: 12, large: 16, extraLarge: 28 };

function buildPalette(mode: 'light' | 'dark', s: ColorScheme) {
  return {
    // Every M3 role by its own name first, then the MUI-shaped entries that
    // deliberately override the flat ones MUI expects as objects.
    ...s,
    mode,
    primary: { main: s.primary, contrastText: s.onPrimary },
    secondary: { main: s.secondary, contrastText: s.onSecondary },
    error: { main: s.error, contrastText: s.onError },
    warning: { main: s.warning, contrastText: s.onWarning },
    success: { main: s.success, contrastText: s.onSuccess },
    info: { main: s.tertiary, contrastText: s.onTertiary },
    background: { default: s.background, paper: s.surface },
    text: {
      primary: s.onSurface,
      secondary: s.onSurfaceVariant,
      disabled: alpha(s.onSurface, 0.38),
    },
    divider: s.outlineVariant,
    action: {
      active: s.onSurfaceVariant,
      hover: alpha(s.onSurface, STATE.hover),
      hoverOpacity: STATE.hover,
      selected: alpha(s.onSurface, STATE.selected),
      selectedOpacity: STATE.selected,
      focus: alpha(s.onSurface, STATE.focus),
      focusOpacity: STATE.focus,
      disabled: alpha(s.onSurface, 0.38),
      disabledBackground: alpha(s.onSurface, 0.12),
      activatedOpacity: STATE.pressed,
    },
  };
}

export const getTheme = (mode: 'light' | 'dark'): Theme => {
  const s: ColorScheme = mode === 'dark' ? darkScheme : lightScheme;

  // In M3, elevation in dark mode is expressed by moving up the surface
  // container tones, not by painting a translucent white film over the
  // surface. Mapping MUI's numeric elevations onto the tones keeps depth
  // legible in both modes.
  const elevationSurface = [
    s.surface,
    s.surfaceContainerLow,
    s.surfaceContainer,
    s.surfaceContainerHigh,
    s.surfaceContainerHighest,
  ];
  const surfaceAt = (level: number) => elevationSurface[Math.min(level, elevationSurface.length - 1)];

  return createTheme({
    palette: buildPalette(mode, s) as never,
    shape: { borderRadius: SHAPE.medium },
    typography: {
      fontFamily:
        '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      ...type,
      // Map MUI's built-in variants onto the M3 scale so existing components
      // pick up the right treatment without being rewritten.
      h1: type.displayLarge,
      h2: type.displayMedium,
      h3: type.displaySmall,
      h4: type.headlineMedium,
      h5: type.headlineSmall,
      h6: type.titleLarge,
      subtitle1: type.titleMedium,
      subtitle2: type.titleSmall,
      body1: type.bodyLarge,
      body2: type.bodyMedium,
      button: { ...type.labelLarge, textTransform: 'none' },
      caption: type.bodySmall,
      overline: { ...type.labelSmall, textTransform: 'uppercase' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Tells the browser to render form controls and scrollbars in the
          // matching scheme — without it, dark mode gets light native chrome.
          ':root': { colorScheme: mode },
          body: { backgroundColor: s.background, color: s.onSurface },
        },
      },
      MuiPaper: {
        styleOverrides: {
          // No backgroundImage overlay: tonal elevation replaces it.
          root: { backgroundImage: 'none' },
        },
        variants: [0, 1, 2, 3, 4].map((level) => ({
          props: { elevation: level },
          style: { backgroundColor: surfaceAt(level) },
        })),
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: s.surfaceContainerLow,
            borderRadius: SHAPE.extraLarge,
            border: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            paddingInline: 24,
            minHeight: 40,
            '&:hover': { boxShadow: 'none' },
          },
          contained: { boxShadow: 'none' },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          // M3 minimum touch target — this is a mobile-first app.
          root: { borderRadius: 999, minWidth: 40, minHeight: 40 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { ...type.labelLarge, borderRadius: SHAPE.small, height: 32 },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: { borderRadius: SHAPE.large },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderColor: s.outline,
            color: s.onSurfaceVariant,
            '&.Mui-selected': {
              backgroundColor: s.secondaryContainer,
              color: s.onSecondaryContainer,
            },
          },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: SHAPE.extraSmall },
          notchedOutline: { borderColor: s.outline },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            ...type.bodySmall,
            backgroundColor: s.inverseSurface,
            color: s.inverseOnSurface,
            borderRadius: SHAPE.extraSmall,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  });
};

/** The colour the browser paints its own chrome with, per mode. */
export const themeColor = (mode: 'light' | 'dark') =>
  (mode === 'dark' ? darkScheme : lightScheme).surface;
