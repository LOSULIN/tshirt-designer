#!/usr/bin/env node
/**
 * 量測 adult-tshirt 模板：左右肩最高點 → HPS 中心 → 衣長、胸寬
 * 輸出 JSON + 標記 SVG
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath =
  process.argv[2] ??
  path.join(__dirname, "../public/templates/adult-tshirt-black-front.png");

const CHEST_LEFT_PCT = 0.201;
const CHEST_RIGHT_PCT = 0.799;
const CHEST_Y_PCT = 0.251;

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

function isShirt(data, w, x, y, h) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const i = idx(w, x, y);
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  if (a < 16) return false;
  return !(r >= 248 && g >= 248 && b >= 248);
}

function isOuterLeft(data, w, h, x, y) {
  return isShirt(data, w, x, y, h) && !isShirt(data, w, x - 1, y, h);
}

function isOuterRight(data, w, h, x, y) {
  return isShirt(data, w, x, y, h) && !isShirt(data, w, x + 1, y, h);
}

function shirtBBox(data, w, h) {
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isShirt(data, w, x, y, h)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

/**
 * 肩縫區（領口兩側、排除袖尖外角）外輪廓最高點。
 * 左肩 x ∈ [18%, 32%]、右肩 x ∈ [68%, 82%]，取最小 y；
 * 同 y 時取最靠近領口中心的一側點。
 */
function findShoulderPeak(data, w, h, bbox, side) {
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
      if (!isShirt(data, w, x, y, h)) continue;

      const onOuter =
        side === "left"
          ? isOuterLeft(data, w, h, x, y)
          : isOuterRight(data, w, h, x, y);
      if (!onOuter) continue;

      const dist = Math.abs(x - centerX);
      if (
        !best ||
        y < best.y ||
        (y === best.y && dist < best.dist)
      ) {
        best = { x, y, dist };
      }
    }
  }

  if (best) return { x: best.x, y: best.y };

  for (let y = bbox.minY; y <= yLimit; y++) {
    for (let x = xFrom; x <= xTo; x++) {
      if (!isShirt(data, w, x, y, h)) continue;
      const dist = Math.abs(x - centerX);
      if (!best || y < best.y || (y === best.y && dist < best.dist)) {
        best = { x, y, dist };
      }
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

function findHemY(data, w, h, bbox) {
  let hemY = bbox.maxY;
  const cx = Math.round((bbox.minX + bbox.maxX) / 2);
  for (let y = bbox.maxY; y >= bbox.minY; y--) {
    if (isShirt(data, w, cx, y, h)) {
      hemY = y;
      break;
    }
  }
  return hemY;
}

function measure(fp) {
  const { width, height, data } = readPngRgba(fp);
  const bbox = shirtBBox(data, width, height);

  const leftShoulder = findShoulderPeak(data, width, height, bbox, "left");
  const rightShoulder = findShoulderPeak(data, width, height, bbox, "right");

  const hps = {
    x: Math.round((leftShoulder.x + rightShoulder.x) / 2),
    y: Math.round((leftShoulder.y + rightShoulder.y) / 2),
  };

  const hemY = findHemY(data, width, height, bbox);
  const bodyLengthPx = hemY - hps.y;

  const chestLeftX = Math.round(width * CHEST_LEFT_PCT);
  const chestRightX = Math.round(width * CHEST_RIGHT_PCT);
  const chestY = Math.round(height * CHEST_Y_PCT);
  const chestWidthPx = chestRightX - chestLeftX;

  const ratio = chestWidthPx / bodyLengthPx;

  return {
    file: path.basename(fp),
    canvas: { width, height },
    leftShoulder,
    rightShoulder,
    hps,
    hemY,
    chest: {
      y: chestY,
      leftX: chestLeftX,
      rightX: chestRightX,
      widthPx: chestWidthPx,
    },
    bodyLengthPx,
    ratio: Number(ratio.toFixed(4)),
  };
}

function buildOverlaySvg(fp, m) {
  const pngB64 = fs.readFileSync(fp).toString("base64");
  const { width, height } = m.canvas;
  const { hps, leftShoulder, rightShoulder, hemY, chest } = m;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="data:image/png;base64,${pngB64}" width="${width}" height="${height}"/>
  <!-- 肩線 -->
  <line x1="${leftShoulder.x}" y1="${leftShoulder.y}" x2="${rightShoulder.x}" y2="${rightShoulder.y}"
        stroke="#22c55e" stroke-width="3" stroke-dasharray="8 6"/>
  <circle cx="${leftShoulder.x}" cy="${leftShoulder.y}" r="10" fill="none" stroke="#22c55e" stroke-width="3"/>
  <circle cx="${rightShoulder.x}" cy="${rightShoulder.y}" r="10" fill="none" stroke="#22c55e" stroke-width="3"/>
  <text x="${leftShoulder.x + 14}" y="${leftShoulder.y + 5}" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#22c55e">L肩 (${leftShoulder.x},${leftShoulder.y})</text>
  <text x="${rightShoulder.x - 280}" y="${rightShoulder.y + 5}" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#22c55e">R肩 (${rightShoulder.x},${rightShoulder.y})</text>
  <!-- HPS -->
  <circle cx="${hps.x}" cy="${hps.y}" r="12" fill="#eab308" stroke="#fff" stroke-width="2"/>
  <line x1="${hps.x - 40}" y1="${hps.y}" x2="${hps.x + 40}" y2="${hps.y}" stroke="#eab308" stroke-width="2"/>
  <line x1="${hps.x}" y1="${hps.y - 40}" x2="${hps.x}" y2="${hps.y + 40}" stroke="#eab308" stroke-width="2"/>
  <text x="${hps.x + 16}" y="${hps.y - 18}" font-family="system-ui,sans-serif" font-size="24" font-weight="700" fill="#eab308">HPS (${hps.x}, ${hps.y})</text>
  <!-- 胸寬 -->
  <line x1="${chest.leftX}" y1="${chest.y}" x2="${chest.rightX}" y2="${chest.y}"
        stroke="#3b82f6" stroke-width="3"/>
  <line x1="${chest.leftX}" y1="${chest.y - 18}" x2="${chest.leftX}" y2="${chest.y + 18}" stroke="#3b82f6" stroke-width="3"/>
  <line x1="${chest.rightX}" y1="${chest.y - 18}" x2="${chest.rightX}" y2="${chest.y + 18}" stroke="#3b82f6" stroke-width="3"/>
  <text x="${(chest.leftX + chest.rightX) / 2}" y="${chest.y - 24}" text-anchor="middle"
        font-family="system-ui,sans-serif" font-size="24" font-weight="700" fill="#3b82f6">胸寬 ${chest.widthPx} px</text>
  <!-- 衣長 -->
  <line x1="${hps.x}" y1="${hps.y}" x2="${hps.x}" y2="${hemY}" stroke="#ef4444" stroke-width="3" stroke-dasharray="10 8"/>
  <circle cx="${hps.x}" cy="${hemY}" r="8" fill="#ef4444"/>
  <text x="${hps.x + 20}" y="${Math.round((hps.y + hemY) / 2)}"
        font-family="system-ui,sans-serif" font-size="24" font-weight="700" fill="#ef4444">衣長 ${m.bodyLengthPx} px</text>
  <!-- 摘要 -->
  <rect x="24" y="24" width="520" height="148" rx="12" fill="rgba(0,0,0,0.72)"/>
  <text x="44" y="58" font-family="ui-monospace,monospace" font-size="20" fill="#fff">HPS: (${hps.x}, ${hps.y})</text>
  <text x="44" y="88" font-family="ui-monospace,monospace" font-size="20" fill="#fff">衣長: ${m.bodyLengthPx} px · 胸寬: ${chest.widthPx} px</text>
  <text x="44" y="118" font-family="ui-monospace,monospace" font-size="20" fill="#fff">比例: ${m.ratio} (胸寬/衣長)</text>
  <text x="44" y="148" font-family="ui-monospace,monospace" font-size="16" fill="#a1a1aa">L肩→R肩 中心 · HPS→下擺中心垂直</text>
</svg>
`;
}

async function rasterizeSvg(svgPath, pngPath) {
  try {
    const sharp = (await import("sharp")).default;
    await sharp(svgPath, { density: 144 })
      .png()
      .toFile(pngPath);
    return true;
  } catch {
    return false;
  }
}

const abs = path.resolve(filePath);
const result = measure(abs);
const outDir = path.join(__dirname, "../public/guides");
fs.mkdirSync(outDir, { recursive: true });

const base = path.basename(abs, ".png");
const svgOut = path.join(outDir, `${base}-measurement.svg`);
const pngOut = path.join(outDir, `${base}-measurement.png`);
fs.writeFileSync(svgOut, buildOverlaySvg(abs, result));
const rasterized = await rasterizeSvg(svgOut, pngOut);

console.log(
  JSON.stringify(
    {
      ...result,
      overlaySvg: path.relative(process.cwd(), svgOut),
      overlayPng: rasterized ? path.relative(process.cwd(), pngOut) : null,
    },
    null,
    2,
  ),
);
