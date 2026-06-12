#!/usr/bin/env node
/**
 * 量測 adult-tshirt 模板領口錨點（1024×1536）
 * - 領口最低點（中心線 U 形底）
 * - 左右肩峰、HPS
 * - 建議 COLLAR_ANCHOR_Y_PX_BY_SIDE
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, "../public/templates");

const DEFAULT_FILES = [
  "adult-tshirt-black-front.png",
  "adult-tshirt-white-front.png",
  "adult-tshirt-white-back.png",
  "adult-tshirt-black-back.png",
];

function readPngRgba(fp) {
  const buffer = fs.readFileSync(fp);
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (offset < buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + len);
    offset += 12 + len;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * bpp);
  let inPos = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[inPos++];
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) row[x] = inflated[inPos++];
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const curr = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const raw = row[i];
      const a = i >= bpp ? curr[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = raw;
      if (filter === 1) v = (raw + a) & 0xff;
      else if (filter === 2) v = (raw + b) & 0xff;
      else if (filter === 3) v = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = (raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
      curr[i] = v;
    }
  }
  return { width, height, data: out };
}

function idx(w, x, y) {
  return (y * w + x) * 4;
}

function detectMode(filePath, data, w, h) {
  if (filePath.includes("white")) return "white-shirt";
  let dark = 0;
  let samples = 0;
  for (let y = 400; y < 900; y += 40) {
    for (let x = 200; x < 800; x += 40) {
      const i = idx(w, x, y);
      if (data[i] < 100) dark++;
      samples++;
    }
  }
  return dark / samples > 0.3 ? "dark-shirt" : "white-shirt";
}

function isShirt(data, w, h, x, y, mode) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const i = idx(w, x, y);
  const a = data[i + 3];
  if (a < 16) return false;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (mode === "white-shirt") return !(r >= 252 && g >= 252 && b >= 252);
  return !(r >= 248 && g >= 248 && b >= 248);
}

function shirtBBox(data, w, h, mode) {
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isShirt(data, w, h, x, y, mode)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

function isOuterLeft(data, w, h, x, y, mode) {
  return isShirt(data, w, h, x, y, mode) && !isShirt(data, w, h, x - 1, y, mode);
}

function isOuterRight(data, w, h, x, y, mode) {
  return isShirt(data, w, h, x, y, mode) && !isShirt(data, w, h, x + 1, y, mode);
}

/** 肩縫區外輪廓最高點 */
function findShoulderPeak(data, w, h, bbox, mode, side) {
  const spanY = bbox.maxY - bbox.minY + 1;
  const yLimit = bbox.minY + Math.round(spanY * 0.12);
  const centerX = (bbox.minX + bbox.maxX) / 2;
  const xFrom =
    side === "left"
      ? Math.round(bbox.minX + w * 0.18)
      : Math.round(bbox.minX + w * 0.68);
  const xTo =
    side === "left"
      ? Math.round(bbox.minX + w * 0.32)
      : Math.round(bbox.minX + w * 0.82);

  let best = null;
  for (let y = bbox.minY; y <= yLimit; y++) {
    for (let x = xFrom; x <= xTo; x++) {
      const onOuter =
        side === "left"
          ? isOuterLeft(data, w, h, x, y, mode)
          : isOuterRight(data, w, h, x, y, mode);
      if (!onOuter) continue;
      const dist = Math.abs(x - centerX);
      if (!best || y < best.y || (y === best.y && dist < best.dist)) {
        best = { x, y, dist };
      }
    }
  }
  return best;
}

/**
 * 領口最低點：中心線附近掃描，找領窩 U 形內最下方衣服像素。
 * 背面：同法，取中心帶最大 y（最靠下輪廓點）。
 */
function findCollarLowest(data, w, h, bbox, mode, centerX) {
  const yMax = Math.min(h, bbox.minY + Math.round((bbox.maxY - bbox.minY) * 0.22));
  const samples = [];

  for (const cx of [
    centerX - 24,
    centerX - 12,
    centerX,
    centerX + 12,
    centerX + 24,
  ]) {
    let inGap = false;
    let sawTop = false;
    let lowY = null;

    for (let y = bbox.minY; y < yMax; y++) {
      const on = isShirt(data, w, h, cx, y, mode);
      if (on) {
        if (!sawTop) sawTop = true;
        else if (inGap) {
          lowY = y;
          break;
        }
      } else if (sawTop) {
        inGap = true;
      }
    }

    if (lowY == null) {
      for (let y = bbox.minY; y < yMax; y++) {
        if (isShirt(data, w, h, cx, y, mode)) lowY = y;
      }
    }

    if (lowY != null) samples.push({ cx, y: lowY });
  }

  const collarLowY = Math.max(...samples.map((s) => s.y));
  const collarLowX = samples.find((s) => s.y === collarLowY)?.cx ?? centerX;
  return { collarLowY, collarLowX, samples };
}

/** 中心線上領口下緣：每行最寬內凹底（備用） */
function findCollarBottomScanline(data, w, h, bbox, mode, centerX) {
  const yMax = Math.min(h, bbox.minY + Math.round((bbox.maxY - bbox.minY) * 0.25));
  let bestY = bbox.minY;
  for (let y = bbox.minY; y < yMax; y++) {
    if (isShirt(data, w, h, centerX, y, mode)) bestY = y;
  }
  return bestY;
}

function measure(filePath) {
  const { width, height, data } = readPngRgba(filePath);
  const mode = detectMode(filePath, data, width, height);
  const bbox = shirtBBox(data, width, height, mode);
  const centerX = Math.round((bbox.minX + bbox.maxX) / 2);
  const side = filePath.includes("-back") ? "back" : "front";

  const leftShoulder = findShoulderPeak(data, width, height, bbox, mode, "left");
  const rightShoulder = findShoulderPeak(
    data,
    width,
    height,
    bbox,
    mode,
    "right",
  );
  const hps = {
    x: Math.round((leftShoulder.x + rightShoulder.x) / 2),
    y: Math.round((leftShoulder.y + rightShoulder.y) / 2),
  };

  const collar = findCollarLowest(data, width, height, bbox, mode, centerX);
  const scanlineBottom = findCollarBottomScanline(
    data,
    width,
    height,
    bbox,
    mode,
    centerX,
  );

  const recommendedAnchorY = collar.collarLowY;

  return {
    file: path.basename(filePath),
    side,
    canvas: { width, height },
    segmentationMode: mode,
    shirtBBox: bbox,
    centerX,
    leftShoulder,
    rightShoulder,
    hps,
    collarLowest: { x: collar.collarLowX, y: collar.collarLowY },
    collarSamples: collar.samples,
    centerScanlineBottomY: scanlineBottom,
    recommendedCollarAnchorY: recommendedAnchorY,
    currentCodeAnchorY: 449,
    deltaFromCurrent: recommendedAnchorY - 449,
  };
}

function buildOverlaySvg(fp, m) {
  const pngB64 = fs.readFileSync(fp).toString("base64");
  const { width, height } = m.canvas;
  const { hps, leftShoulder, rightShoulder, collarLowest, centerX } = m;
  const anchorY = m.recommendedCollarAnchorY;
  const pxPerCm = 12.24;
  const offsetCm = m.side === "front" ? 7 : 5;
  const printTopY = anchorY + offsetCm * pxPerCm;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="data:image/png;base64,${pngB64}" width="${width}" height="${height}"/>
  <line x1="${leftShoulder.x}" y1="${leftShoulder.y}" x2="${rightShoulder.x}" y2="${rightShoulder.y}" stroke="#22c55e" stroke-width="3"/>
  <circle cx="${hps.x}" cy="${hps.y}" r="10" fill="#eab308" stroke="#fff" stroke-width="2"/>
  <text x="${hps.x + 14}" y="${hps.y - 10}" font-size="20" font-weight="700" fill="#eab308">HPS (${hps.x},${hps.y})</text>
  <line x1="${centerX - 60}" y1="${anchorY}" x2="${centerX + 60}" y2="${anchorY}" stroke="#f97316" stroke-width="3"/>
  <circle cx="${collarLowest.x}" cy="${collarLowest.y}" r="10" fill="none" stroke="#f97316" stroke-width="3"/>
  <text x="${centerX + 70}" y="${anchorY + 6}" font-size="22" font-weight="700" fill="#f97316">領口 anchor Y=${anchorY}</text>
  <line x1="80" y1="${printTopY}" x2="${width - 80}" y2="${printTopY}" stroke="#3b82f6" stroke-width="2" stroke-dasharray="10 8"/>
  <text x="90" y="${printTopY - 10}" font-size="20" font-weight="700" fill="#3b82f6">Print top @ ${offsetCm}cm → Y=${Math.round(printTopY)}</text>
  <rect x="20" y="20" width="560" height="120" rx="10" fill="rgba(0,0,0,0.75)"/>
  <text x="40" y="52" font-family="ui-monospace,monospace" font-size="18" fill="#fff">${m.file} · ${m.side}</text>
  <text x="40" y="80" font-family="ui-monospace,monospace" font-size="18" fill="#fff">collar anchor ${anchorY} (was 449, Δ${m.deltaFromCurrent})</text>
  <text x="40" y="108" font-family="ui-monospace,monospace" font-size="16" fill="#a1a1aa">HPS y=${hps.y} · print top=${Math.round(printTopY)}</text>
</svg>`;
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : DEFAULT_FILES.map((f) => path.join(TEMPLATE_DIR, f));

const outDir = path.join(__dirname, "../public/guides");
fs.mkdirSync(outDir, { recursive: true });

const results = [];
for (const fp of files) {
  const abs = path.resolve(fp);
  if (!fs.existsSync(abs)) {
    console.error("missing:", abs);
    continue;
  }
  const m = measure(abs);
  results.push(m);
  const base = path.basename(abs, ".png");
  fs.writeFileSync(
    path.join(outDir, `${base}-collar-anchor.svg`),
    buildOverlaySvg(abs, m),
  );
}

const frontYs = results.filter((r) => r.side === "front").map((r) => r.recommendedCollarAnchorY);
const backYs = results.filter((r) => r.side === "back").map((r) => r.recommendedCollarAnchorY);

const summary = {
  measurements: results,
  recommended: {
    front: frontYs.length
      ? Math.round(frontYs.reduce((a, b) => a + b, 0) / frontYs.length)
      : null,
    back: backYs.length
      ? Math.round(backYs.reduce((a, b) => a + b, 0) / backYs.length)
      : null,
    frontRange: frontYs.length ? { min: Math.min(...frontYs), max: Math.max(...frontYs) } : null,
    backRange: backYs.length ? { min: Math.min(...backYs), max: Math.max(...backYs) } : null,
  },
  current: { front: 449, back: 449 },
};

console.log(JSON.stringify(summary, null, 2));
