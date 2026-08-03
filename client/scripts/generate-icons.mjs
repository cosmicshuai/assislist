// scripts/generate-icons.mjs — render the app icon to the raster sizes an
// installable PWA actually needs.
//
//   npm run generate:icons
//
// A lone SVG with purpose "any" is not enough: Android needs 192/512 PNGs and
// a *maskable* variant (artwork inside the safe circle, background bled to the
// edges) or it renders a shrunken icon in a white blob, and iOS ignores SVG
// icons entirely and wants an apple-touch-icon.
//
// PNGs are encoded here rather than pulled from an image library — the icon is
// flat colour and rounded rectangles, so a rasteriser is a dependency we would
// carry forever for nothing.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { darkScheme, lightScheme } from './lib/scheme.mjs';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public');

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// --- PNG encoding -----------------------------------------------------------

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encode RGBA pixel data (width*height*4) as a PNG buffer. */
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10..12: compression, filter, interlace — all 0

  // One filter byte (0 = None) per scanline.
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Drawing ----------------------------------------------------------------

/** 4x supersampled coverage, so edges are smooth without a rasteriser. */
function coverage(shape, x, y) {
  let hits = 0;
  for (let sy = 0; sy < 4; sy += 1) {
    for (let sx = 0; sx < 4; sx += 1) {
      if (shape(x + (sx + 0.5) / 4, y + (sy + 0.5) / 4)) hits += 1;
    }
  }
  return hits / 16;
}

const roundedRect = (x0, y0, x1, y1, r) => (x, y) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

const circle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

/**
 * The mark: three stacked task bars with a check dot beside the top one.
 * `inset` is the fraction of the canvas kept clear at each edge — 0 for a
 * normal icon, ~0.1 for maskable, where the platform may crop to a circle.
 */
function drawIcon(size, { background, bar, accent, inset = 0, rounded = true }) {
  const rgba = Buffer.alloc(size * size * 4);
  const [br, bg, bb] = hex(background);
  const [rr, rg, rb] = hex(bar);
  const [ar, ag, ab] = hex(accent);

  const bgShape = rounded
    ? roundedRect(0, 0, size, size, size * 0.22)
    : () => true;

  // Content lives inside the safe area; the background always bleeds to the edge.
  const pad = size * inset;
  const s = (v) => pad + v * (size - 2 * pad);

  const barH = 0.085;
  const barR = barH / 2;
  const bars = [
    roundedRect(s(0.16), s(0.235), s(0.66), s(0.235 + barH), s(barR)),
    roundedRect(s(0.16), s(0.4575), s(0.66), s(0.4575 + barH), s(barR)),
    roundedRect(s(0.16), s(0.68), s(0.52), s(0.68 + barH), s(barR)),
  ];
  const dots = [
    circle(s(0.79), s(0.2775), s(0.075)),
    circle(s(0.79), s(0.5), s(0.075)),
    circle(s(0.79), s(0.7225), s(0.075)),
  ];

  const blend = (i, a, r, g, b) => {
    rgba[i] = Math.round(rgba[i] * (1 - a) + r * a);
    rgba[i + 1] = Math.round(rgba[i + 1] * (1 - a) + g * a);
    rgba[i + 2] = Math.round(rgba[i + 2] * (1 - a) + b * a);
    rgba[i + 3] = Math.round(rgba[i + 3] + (255 - rgba[i + 3]) * a);
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      blend(i, coverage(bgShape, x, y), br, bg, bb);
      for (const shape of bars) blend(i, coverage(shape, x, y), rr, rg, rb);
      for (const shape of dots) blend(i, coverage(shape, x, y), ar, ag, ab);
    }
  }
  return encodePng(size, size, rgba);
}

// --- Outputs ----------------------------------------------------------------

// Icon colours come from the same generated scheme as the UI, so the installed
// icon matches the app it launches.
const colors = {
  background: darkScheme.primaryContainer,
  bar: darkScheme.onPrimaryContainer,
  accent: darkScheme.tertiary,
};

const outputs = [
  ['icon-192.png', drawIcon(192, colors)],
  ['icon-512.png', drawIcon(512, colors)],
  // Maskable: square, no corner rounding of our own (the platform applies its
  // own mask), artwork pulled inside the safe area.
  ['icon-maskable-192.png', drawIcon(192, { ...colors, inset: 0.1, rounded: false })],
  ['icon-maskable-512.png', drawIcon(512, { ...colors, inset: 0.1, rounded: false })],
  // iOS home screen. It composites onto its own rounded mask and does not
  // support transparency, so this one stays square-filled.
  ['apple-touch-icon.png', drawIcon(180, { ...colors, rounded: false })],
];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="AssisList">
  <rect width="512" height="512" rx="113" fill="${colors.background}"/>
  <g fill="${colors.bar}">
    <rect x="82" y="120" width="256" height="44" rx="22"/>
    <rect x="82" y="234" width="256" height="44" rx="22"/>
    <rect x="82" y="348" width="184" height="44" rx="22"/>
  </g>
  <g fill="${colors.accent}">
    <circle cx="404" cy="142" r="38"/>
    <circle cx="404" cy="256" r="38"/>
    <circle cx="404" cy="370" r="38"/>
  </g>
</svg>
`;

for (const [name, buf] of outputs) {
  writeFileSync(resolve(OUT, name), buf);
  console.log(`✅ ${name} (${(buf.length / 1024).toFixed(1)} kB)`);
}
writeFileSync(resolve(OUT, 'icon.svg'), svg);
console.log('✅ icon.svg');
console.log(`   light theme-color ${lightScheme.surface} / dark ${darkScheme.surface}`);
