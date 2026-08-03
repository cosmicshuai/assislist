// scripts/lib/color.mjs — the colour maths behind the generated M3 tokens.
//
// Material 3 builds every role from tonal palettes: a fixed hue and chroma
// sampled at a set of lightness "tones". We work in CIE L*C*h, which gives a
// perceptually even ramp — the property that makes the tones meaningful —
// and clamp chroma back into sRGB per tone so nothing silently clips.

const clamp01 = (x) => Math.min(1, Math.max(0, x));

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

// D65 reference white
const WHITE = [0.95047, 1.0, 1.08883];

function rgbToXyz([r, g, b]) {
  const [R, G, B] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  return [
    R * 0.4124564 + G * 0.3575761 + B * 0.1804375,
    R * 0.2126729 + G * 0.7151522 + B * 0.0721750,
    R * 0.0193339 + G * 0.1191920 + B * 0.9503041,
  ];
}

function xyzToRgb([x, y, z]) {
  const R = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  const G = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
  const B = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
  return [linearToSrgb(R), linearToSrgb(G), linearToSrgb(B)];
}

const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
const fInv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (t - 4 / 29) / (841 / 108));

export function rgbToLab(rgb) {
  const [x, y, z] = rgbToXyz(rgb);
  const [fx, fy, fz] = [f(x / WHITE[0]), f(y / WHITE[1]), f(z / WHITE[2])];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function labToRgb([L, a, b]) {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  return xyzToRgb([WHITE[0] * fInv(fx), WHITE[1] * fInv(fy), WHITE[2] * fInv(fz)]);
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

export function rgbToHex(rgb) {
  return `#${rgb.map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0')).join('')}`;
}

const inGamut = (rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/**
 * A tonal palette: fixed hue and target chroma, sampled by tone (L* 0–100).
 * Chroma is reduced by bisection until the colour fits in sRGB, so a tone is
 * always the most saturated colour that is actually displayable at that
 * lightness — never a clipped approximation.
 */
export function tonalPalette({ hue, chroma }) {
  return (tone) => {
    const L = Math.min(100, Math.max(0, tone));
    const rad = (hue * Math.PI) / 180;
    const at = (c) => labToRgb([L, Math.cos(rad) * c, Math.sin(rad) * c]);

    if (inGamut(at(chroma))) return rgbToHex(at(chroma));

    let lo = 0;
    let hi = chroma;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(at(mid))) lo = mid;
      else hi = mid;
    }
    return rgbToHex(at(lo));
  };
}

/** Hue and chroma of a seed colour, in L*C*h. */
export function seedToHueChroma(hex) {
  const [, a, b] = rgbToLab(hexToRgb(hex));
  return {
    hue: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
    chroma: Math.hypot(a, b),
  };
}

/** WCAG relative luminance. */
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours. */
export function contrast(a, b) {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
