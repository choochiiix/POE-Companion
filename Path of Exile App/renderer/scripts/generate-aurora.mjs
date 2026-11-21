import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

// art.py-inspired aurora generator. Resolution is the LED grid resolution;
// supersampling smooths the continuous aurora before palette quantization.
const WIDTH = 960;
const HEIGHT = 540;
const SUPERSAMPLE = 3;
const DITHER_STRENGTH = 38;
const SEED = 7;

const paletteHex = [
  '#030b15', '#071b2a', '#0a2b3d', '#0d4050',
  '#12585c', '#1a7063', '#26896b', '#399f75',
  '#56b484', '#79c793', '#9ed7a5', '#b9e8bd',
  '#4eb9ad', '#7be1c7', '#c8f8e2', '#effff2',
];
const palette = paletteHex.map(hex => [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16)));
const stops = [
  [-1.8, '#0a263c'], [-1.0, '#155d68'], [-0.35, '#6ed8c0'],
  [0.1, '#b6f5d8'], [0.6, '#58c5ae'], [1.1, '#2b8f86'],
  [1.7, '#24706d'], [2.4, '#12304a'],
].map(([position, hex]) => [Number(position), [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16))]);
const bayer8 = [
  [0,32,8,40,2,34,10,42], [48,16,56,24,50,18,58,26],
  [12,44,4,36,14,46,6,38], [60,28,52,20,62,30,54,22],
  [3,35,11,43,1,33,9,41], [51,19,59,27,49,17,57,25],
  [15,47,7,39,13,45,5,37], [63,31,55,23,61,29,59,21],
].map(row => row.map(value => value / 64 - 0.5));

function mix(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function sampleSky(u, v) {
  const glow = Math.exp(-(((u - 0.62) / 0.5) ** 2 + ((v - 0.45) / 0.55) ** 2));
  const base = mix(palette[0], palette[1], glow * 0.55);
  const center = 0.78 - u * 0.72 + 0.035 * Math.sin(u * 9) + 0.02 * Math.sin(u * 23 + 1);
  const width = 0.11 + 0.05 * Math.sin(u * 5 + 0.7);
  const d = (v - center) / width;
  const band = Math.exp(-d * d * 0.9) * Math.max(0, Math.min(1, u * 2.2)) * Math.max(0, Math.min(1, (1.05 - u) * 4));

  let color = stops[0][1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [d0, c0] = stops[i];
    const [d1, c1] = stops[i + 1];
    if (d >= d0 && d < d1) { color = mix(c0, c1, (d - d0) / (d1 - d0)); break; }
    if (d >= stops.at(-1)[0]) color = stops.at(-1)[1];
  }

  const streak = 0.75 + 0.25 * Math.sin(u * 60 + v * 22) * Math.sin(u * 17 + 2);
  let result = mix(base, color, band * streak * 1.15);
  const curtain = Math.exp(-(((v - (center + 0.18)) / 0.25) ** 2))
    * (0.5 + 0.5 * Math.sin(u * 140 + Math.sin(u * 13) * 3)) ** 3;
  result = mix(result, [62, 177, 153], curtain * Math.max(0.15, band) * 0.3);
  return [result, band];
}

function nearestColor(rgb, threshold) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const dr = rgb[0] + threshold - palette[i][0];
    const dg = rgb[1] + threshold - palette[i][1];
    const db = rgb[2] + threshold - palette[i][2];
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) { bestDistance = distance; best = i; }
  }
  return best;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  name.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return chunk;
}

let randomState = SEED >>> 0;
function random() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 0x100000000;
}

const indices = new Uint8Array(WIDTH * HEIGHT);
const bandMap = new Float32Array(WIDTH * HEIGHT);
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const sum = [0, 0, 0];
    let bandSum = 0;
    for (let sy = 0; sy < SUPERSAMPLE; sy++) {
      for (let sx = 0; sx < SUPERSAMPLE; sx++) {
        const u = (x + (sx + 0.5) / SUPERSAMPLE) / WIDTH;
        const v = (y + (sy + 0.5) / SUPERSAMPLE) / HEIGHT;
        const [rgb, band] = sampleSky(u, v);
        sum[0] += rgb[0]; sum[1] += rgb[1]; sum[2] += rgb[2]; bandSum += band;
      }
    }
    const offset = y * WIDTH + x;
    const rgb = sum.map(channel => channel / (SUPERSAMPLE * SUPERSAMPLE));
    const threshold = bayer8[y % 8][x % 8] * DITHER_STRENGTH;
    const band = bandSum / (SUPERSAMPLE * SUPERSAMPLE);
    bandMap[offset] = band;
    let color = nearestColor(rgb, threshold);
    if (rgb[0] + rgb[1] + rgb[2] < 62 && random() < 0.0015) color = 2 + Math.floor(random() * 4);
    if (band > 0.55 && random() < 0.0004) color = 15;
    indices[offset] = color;
  }
}

// PNG indexed-color 4-bit output, matching art.py's compact palette image.
const rowBytes = Math.ceil(WIDTH / 2);
const scanlines = Buffer.alloc((rowBytes + 1) * HEIGHT);
for (let y = 0; y < HEIGHT; y++) {
  const rowOffset = y * (rowBytes + 1);
  scanlines[rowOffset] = 0;
  for (let x = 0; x < WIDTH; x += 2) {
    scanlines[rowOffset + 1 + (x >> 1)] = (indices[y * WIDTH + x] << 4) | indices[y * WIDTH + x + 1];
  }
}
const header = Buffer.alloc(13);
header.writeUInt32BE(WIDTH, 0); header.writeUInt32BE(HEIGHT, 4);
header[8] = 4; header[9] = 3;
const paletteChunk = Buffer.from(palette.flat());
const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  pngChunk('IHDR', header), pngChunk('PLTE', paletteChunk),
  pngChunk('IDAT', deflateSync(scanlines, { level: 9 })), pngChunk('IEND', Buffer.alloc(0)),
]);

const output = fileURLToPath(new URL('../src/features/character/ascii-aurora-emerald-balanced.png', import.meta.url));
await writeFile(output, png);

// Keep the Character UI accents derived from the exact same palette as the art.
const rgba = (index, alpha) => {
  const [r, g, b] = palette[index];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const themeCss = `/* Generated by scripts/generate-aurora.mjs. Edit the generator palette, not this file. */
:root {
  --aurora-base: ${paletteHex[0]};
  --aurora-deep: ${paletteHex[1]};
  --aurora-mid: ${paletteHex[2]};
  --aurora-surface-color: ${paletteHex[3]};
  --aurora-green: ${paletteHex[8]};
  --aurora-teal: ${paletteHex[12]};
  --aurora-accent: ${paletteHex[13]};
  --aurora-soft: ${paletteHex[14]};
  --aurora-text: ${paletteHex[15]};
  --aurora-muted: ${paletteHex[10]};
  --aurora-glass: ${rgba(1, 0.78)};
  --aurora-surface: ${rgba(2, 0.72)};
  --aurora-raised: ${rgba(3, 0.84)};
  --aurora-line: ${rgba(13, 0.24)};
  --aurora-border: ${rgba(9, 0.38)};
  --aurora-selection: ${rgba(12, 0.24)};
  --aurora-glow: ${rgba(12, 0.24)};
  --aurora-glow-strong: ${rgba(13, 0.38)};
  --aurora-glow-soft: ${rgba(14, 0.12)};
  --aurora-shadow: ${rgba(0, 0.62)};
}

body {
  --aurora-control: color-mix(in srgb, var(--aurora-accent) 14%, transparent);
  --control-hover: var(--aurora-control);
}

.app-shell[data-route='character'],
#characterPanel[data-character-theme='nyx'],
.character-design-dialog {
  --bg: var(--aurora-base);
  --bg-secondary: var(--aurora-glass);
  --surface: var(--aurora-surface);
  --surface-raised: var(--aurora-raised);
  --text: var(--aurora-text);
  --text-secondary: var(--aurora-soft);
  --text-muted: var(--aurora-muted);
  --text-caption: ${paletteHex[9]};
  --accent: var(--aurora-accent);
  --accent-hover: var(--aurora-soft);
  --accent-gold: ${paletteHex[11]};
  --accent-blue: var(--aurora-teal);
  --success: ${paletteHex[9]};
  --selection-bg: var(--aurora-selection);
  --control-hover: var(--aurora-control);
  --line: var(--aurora-line);
  --control-border: var(--aurora-border);
  --focus-ring: 2px solid var(--aurora-accent);
}

.app-shell[data-route='character'] .app-sidebar {
  position: relative;
  overflow: hidden;
  background: ${rgba(0, 0.08)} !important;
  border-color: var(--aurora-line);
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  box-shadow: inset -1px 0 ${rgba(14, 0.12)}, 8px 0 32px var(--aurora-shadow);
}
.app-shell[data-route='character'] .app-sidebar > :not(.character-glass-layer):not(.sidebar-toggle) {
  position: relative;
  z-index: 1;
}

#characterPanel[data-character-theme='nyx'] { background: var(--aurora-base); color: var(--aurora-text); }
#characterPanel[data-character-theme='nyx']::before {
  background: radial-gradient(ellipse at 70% 12%, ${rgba(13, 0.20)}, transparent 42%), radial-gradient(ellipse at 28% 26%, ${rgba(12, 0.14)}, transparent 48%) !important;
  animation: none;
}
#characterPanel[data-character-theme='nyx']::after {
  background: linear-gradient(90deg, ${rgba(0, 0.16)}, transparent 48%, ${rgba(0, 0.12)}), linear-gradient(180deg, ${rgba(1, 0.08)}, ${rgba(0, 0.30)}) !important;
}
#characterPanel[data-character-theme='nyx'] .character-workspace {
  background: ${rgba(0, 0.10)} !important;
  border-color: var(--line);
  box-shadow: 0 18px 48px var(--aurora-shadow), inset 0 1px ${rgba(14, 0.08)};
  backdrop-filter: none;
}
#characterPanel[data-character-theme='nyx'] :is(.character-panel,.loadout-panel,.calculation-detail,.calculation-bottom-grid>section,.calculation-comparison-view) {
  background: ${rgba(0, 0.05)};
  border-color: transparent;
  box-shadow: 0 14px 34px var(--aurora-shadow);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}
.character-glass-backdrop {
  position: fixed !important;
  left: 0 !important;
  top: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  object-fit: cover !important;
  object-position: center top !important;
  max-width: none !important;
  opacity: 0;
  pointer-events: none;
  z-index: -1;
}
.character-glass-layer {
  position: absolute !important;
  inset: 0 !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  z-index: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
}
.character-glass-layer .glass-surface__content { display: none; }
.character-glass-layer .glass-surface__frame {
  background: linear-gradient(145deg, ${rgba(0, 0.11)}, ${rgba(1, 0.08)} 46%, ${rgba(2, 0.05)}) !important;
  box-shadow: inset 0 1px ${rgba(14, 0.16)}, inset 0 -1px ${rgba(0, 0.20)};
}
.character-glass-layer.glass-surface--svg {
  background: linear-gradient(145deg, ${rgba(0, 0.11)}, ${rgba(1, 0.08)} 46%, ${rgba(2, 0.05)}) !important;
  -webkit-backdrop-filter: var(--filter-id) blur(4px) saturate(112%);
  backdrop-filter: var(--filter-id) blur(4px) saturate(112%);
  box-shadow: inset 0 1px ${rgba(14, 0.16)}, inset 0 -1px ${rgba(0, 0.20)};
}
#characterPanel[data-character-theme='nyx'] :is(.character-panel,.loadout-panel,.calculation-detail,.calculation-bottom-grid>section,.calculation-comparison-view) > :not(.character-glass-layer) {
  position: relative;
  z-index: 1;
}
#characterPanel[data-character-theme='nyx'] .calculation-view-tabs.plan-switch {
  background: ${rgba(0, 0.54)};
  border-color: var(--aurora-line);
  backdrop-filter: blur(14px);
}
#characterPanel[data-character-theme='nyx'] .plan-switch-highlight {
  background: linear-gradient(110deg, var(--aurora-teal), var(--aurora-accent) 62%, var(--aurora-soft));
  box-shadow: 0 0 20px var(--aurora-glow-strong);
}
#characterPanel[data-character-theme='nyx'] :where(button:not(.definition-term)):hover {
  background: var(--aurora-control);
  border-color: var(--aurora-border);
  box-shadow: 0 0 14px ${rgba(12, 0.10)};
}
body:has(.app-shell[data-route='character']) :is(.definition-bubble,.dialog-content,.spring-options,.spring-dropdown-menu) {
  background: var(--aurora-raised);
  border-color: var(--aurora-border);
  color: var(--aurora-text);
  box-shadow: 0 16px 44px var(--aurora-shadow), 0 0 18px ${rgba(12, 0.10)};
  backdrop-filter: blur(16px) saturate(130%);
}
`;
const themeOutput = fileURLToPath(new URL('../src/features/character/aurora-palette.generated.css', import.meta.url));
await writeFile(themeOutput, themeCss);
console.log(`Generated ${WIDTH}×${HEIGHT} aurora (${SUPERSAMPLE}× supersampling, ${DITHER_STRENGTH} dither, 4-bit palette) and matching Character UI palette.`);
