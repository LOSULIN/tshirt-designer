#!/usr/bin/env node
/**
 * Phase 76 — render back placement overlay on UA35001 product photo.
 */
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const OUT = __dirname;
const PX_PER_CM = 12.24;

const BACK = {
  collarY: 327,
  offsetCm: 5,
  printTop: 388.2,
  printArea: { left: 280.44, width: 465.12, height: 550.8 },
  registryTop: 388,
};

function overlaySvg() {
  const collar = BACK.collarY;
  const printTop = BACK.printTop;
  const { left, width, height } = BACK.printArea;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536">
  <line x1="400" y1="${collar}" x2="624" y2="${collar}" stroke="#ef4444" stroke-width="2"/>
  <text x="24" y="${collar - 8}" fill="#ef4444" font-size="18" font-family="sans-serif">Collar seam y=${collar}</text>
  <line x1="250" y1="${printTop}" x2="774" y2="${printTop}" stroke="#2563eb" stroke-width="3"/>
  <text x="24" y="${printTop - 10}" fill="#2563eb" font-size="18" font-family="sans-serif">Print top y=${printTop} (5cm = ${(BACK.offsetCm * PX_PER_CM).toFixed(1)}px below collar)</text>
  <rect x="${left}" y="${printTop}" width="${width}" height="${height}" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="8 4"/>
  <text x="24" y="56" fill="#22c55e" font-size="18" font-family="sans-serif">Registry calibration top y=${BACK.registryTop}</text>
</svg>`;
}

async function render(color) {
  const asset = join(
    ROOT,
    `public/products/UA35001/assets/adult-tshirt-${color}-back.png`,
  );
  const out = join(OUT, `back-placement-${color}.png`);
  await sharp(asset)
    .composite([{ input: Buffer.from(overlaySvg()), top: 0, left: 0 }])
    .png()
    .toFile(out);
  console.log(`Wrote ${out}`);
}

fs.mkdirSync(OUT, { recursive: true });
await Promise.all(["white", "black"].map(render));
