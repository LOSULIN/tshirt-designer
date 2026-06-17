#!/usr/bin/env node
/**
 * M 號模板實測（成衣基準）：
 * - 胸寬：左腋下 → 右腋下（輪廓腋下凹點）
 * - 衣長：HPS（左右肩最高點連線中心）→ 下擺中心
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath =
  process.argv[2] ??
  path.join(__dirname, "../public/templates/adult-tshirt-black-front.png");

const M_CHEST_CM = 50;
const M_LENGTH_CM = 68;

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

function isShirt(data, w, h, x, y) {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const i = idx(w, x, y);
  const a = data[i + 3];
  if (a < 16) return false;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  return !(r >= 248 && g >= 248 && b >= 248);
}

function isBoundary(data, w, h, x, y) {
  if (!isShirt(data, w, h, x, y)) return false;
  return (
    !isShirt(data, w, h, x - 1, y) ||
    !isShirt(data, w, h, x + 1, y) ||
    !isShirt(data, w, h, x, y - 1) ||
    !isShirt(data, w, h, x, y + 1)
  );
}

function shirtBBox(data, w, h) {
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isShirt(data, w, h, x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return { minX, minY, maxX, maxY };
}

function isOuterLeft(data, w, h, x, y) {
  return isShirt(data, w, h, x, y) && !isShirt(data, w, h, x - 1, y);
}

function isOuterRight(data, w, h, x, y) {
  return isShirt(data, w, h, x, y) && !isShirt(data, w, h, x + 1, y);
}

/** 肩縫區外輪廓最高點（排除袖尖） */
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
      const onOuter =
        side === "left"
          ? isOuterLeft(data, w, h, x, y)
          : isOuterRight(data, w, h, x, y);
      if (!onOuter) continue;
      const dist = Math.abs(x - centerX);
      if (!best || y < best.y || (y === best.y && dist < best.dist)) {
        best = { x, y, dist };
      }
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

/** 下擺中心 y */
function findHemY(data, w, h, bbox, hpsX) {
  for (let y = bbox.maxY; y >= bbox.minY; y--) {
    if (isShirt(data, w, h, hpsX, y)) return y;
  }
  return bbox.maxY;
}

/**
 * 腋下凹點：肩下 14–30% 衣長帶內，軀幹側邊界輪廓。
 * 左：x∈[170,280] 取最靠中心（max x），同 x 取較低 y；
 * 右：x∈[740,850] 取最靠中心（min x），同 x 取較低 y。
 */
function findArmpitPoints(data, w, h, bbox, hps) {
  const bodyH = bbox.maxY - hps.y;
  const yStart = hps.y + Math.round(bodyH * 0.14);
  const yEnd = hps.y + Math.round(bodyH * 0.3);

  function findInZone(xMin, xMax, score) {
    let best = null;
    for (let y = yStart; y <= yEnd; y++) {
      for (let x = xMin; x <= xMax; x++) {
        if (!isBoundary(data, w, h, x, y)) continue;
        if (!best || score(best, { x, y }) > 0) best = { x, y };
      }
    }
    return best;
  }

  const leftArmpit = findInZone(170, 280, (a, b) => b.x - a.x || b.y - a.y);
  const rightArmpit = findInZone(740, 850, (a, b) => a.x - b.x || b.y - a.y);
  const chestY = Math.round((leftArmpit.y + rightArmpit.y) / 2);
  const chestWidthPx = rightArmpit.x - leftArmpit.x;

  return { leftArmpit, rightArmpit, chestY, chestWidthPx, yStart, yEnd };
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

  const hemY = findHemY(data, width, height, bbox, hps.x);
  const bodyLengthPx = hemY - hps.y;

  const armpit = findArmpitPoints(data, width, height, bbox, hps);
  const ratio = armpit.chestWidthPx / bodyLengthPx;
  const theoryRatio = M_CHEST_CM / M_LENGTH_CM;

  return {
    file: path.basename(fp),
    canvas: { width, height },
    mSize: { chestCm: M_CHEST_CM, lengthCm: M_LENGTH_CM },
    shoulders: { left: leftShoulder, right: rightShoulder },
    hps,
    hem: { x: hps.x, y: hemY },
    bodyLengthPx,
    armpit,
    chestWidthPx: armpit.chestWidthPx,
    ratio: Number(ratio.toFixed(4)),
    theoryRatio: Number(theoryRatio.toFixed(4)),
    ratioErrorPct: Number(
      (((ratio - theoryRatio) / theoryRatio) * 100).toFixed(2),
    ),
    pxPerCm: {
      fromChest: Number((armpit.chestWidthPx / M_CHEST_CM).toFixed(3)),
      fromLength: Number((bodyLengthPx / M_LENGTH_CM).toFixed(3)),
    },
    previewCalibration: {
      leftX: Math.round(width * 0.201),
      rightX: Math.round(width * 0.799),
      y: Math.round(height * 0.251),
      chestPx: Math.round(width * 0.799) - Math.round(width * 0.201),
      pxPerCm: 12.24,
      note: "Preview 標定線（20.1% 邊距 @ 25.1% 高），非腋下凹點",
    },
  };
}

function buildOverlaySvg(fp, m) {
  const pngB64 = fs.readFileSync(fp).toString("base64");
  const { width, height } = m.canvas;
  const { hps, shoulders, hem, armpit, bodyLengthPx, chestWidthPx } = m;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image href="data:image/png;base64,${pngB64}" width="${width}" height="${height}"/>
  <line x1="${shoulders.left.x}" y1="${shoulders.left.y}" x2="${shoulders.right.x}" y2="${shoulders.right.y}"
        stroke="#22c55e" stroke-width="3" stroke-dasharray="8 6"/>
  <circle cx="${shoulders.left.x}" cy="${shoulders.left.y}" r="9" fill="none" stroke="#22c55e" stroke-width="3"/>
  <circle cx="${shoulders.right.x}" cy="${shoulders.right.y}" r="9" fill="none" stroke="#22c55e" stroke-width="3"/>
  <circle cx="${hps.x}" cy="${hps.y}" r="11" fill="#eab308" stroke="#fff" stroke-width="2"/>
  <text x="${hps.x + 14}" y="${hps.y - 12}" font-size="22" font-weight="700" fill="#eab308">HPS (${hps.x},${hps.y})</text>
  <circle cx="${armpit.leftArmpit.x}" cy="${armpit.leftArmpit.y}" r="9" fill="none" stroke="#3b82f6" stroke-width="3"/>
  <circle cx="${armpit.rightArmpit.x}" cy="${armpit.rightArmpit.y}" r="9" fill="none" stroke="#3b82f6" stroke-width="3"/>
  <line x1="${armpit.leftArmpit.x}" y1="${armpit.chestY}" x2="${armpit.rightArmpit.x}" y2="${armpit.chestY}"
        stroke="#3b82f6" stroke-width="3"/>
  <text x="${(armpit.leftArmpit.x + armpit.rightArmpit.x) / 2}" y="${armpit.chestY - 16}" text-anchor="middle"
        font-size="24" font-weight="700" fill="#3b82f6">腋下胸寬 ${chestWidthPx} px</text>
  <line x1="${hps.x}" y1="${hps.y}" x2="${hem.x}" y2="${hem.y}" stroke="#ef4444" stroke-width="3" stroke-dasharray="10 8"/>
  <circle cx="${hem.x}" cy="${hem.y}" r="8" fill="#ef4444"/>
  <text x="${hps.x + 18}" y="${Math.round((hps.y + hem.y) / 2)}" font-size="24" font-weight="700" fill="#ef4444">衣長 ${bodyLengthPx} px</text>
  <rect x="20" y="20" width="580" height="170" rx="10" fill="rgba(0,0,0,0.75)"/>
  <text x="40" y="52" font-family="ui-monospace,monospace" font-size="18" fill="#fff">M號實測 · 腋下胸寬 ${chestWidthPx}px · 衣長 ${bodyLengthPx}px</text>
  <text x="40" y="80" font-family="ui-monospace,monospace" font-size="18" fill="#fff">比例 ${m.ratio} · M理論 ${m.theoryRatio} · 誤差 ${m.ratioErrorPct}%</text>
  <text x="40" y="108" font-family="ui-monospace,monospace" font-size="16" fill="#a1a1aa">胸 ${m.pxPerCm.fromChest} px/cm · 長 ${m.pxPerCm.fromLength} px/cm</text>
  <text x="40" y="136" font-family="ui-monospace,monospace" font-size="16" fill="#a1a1aa">Codebase 標定胸寬 612px @ 12.24（基準不同）</text>
</svg>`;
}

async function main() {
  const abs = path.resolve(filePath);
  const result = measure(abs);
  const outDir = path.join(__dirname, "../public/guides");
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.basename(abs, ".png");
  const svgOut = path.join(outDir, `${base}-garment-measurement.svg`);
  const pngOut = path.join(outDir, `${base}-garment-measurement.png`);
  fs.writeFileSync(svgOut, buildOverlaySvg(abs, result));
  try {
    const sharp = (await import("sharp")).default;
    await sharp(svgOut, { density: 144 }).png().toFile(pngOut);
  } catch {
    // svg only
  }
  console.log(JSON.stringify({ ...result, overlaySvg: svgOut, overlayPng: pngOut }, null, 2));
}

main();
