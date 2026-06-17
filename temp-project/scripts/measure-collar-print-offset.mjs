#!/usr/bin/env node
/**
 * 量測模板：領口下緣 → 印刷區上緣／中心（cm）
 * 比例：印刷區 50cm = 500px → 10 px/cm
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "../public/templates");

const CANVAS_W = 1024;
const CANVAS_H = 1536;
const PRINT_W = 350;
const PRINT_H = 500;
const PRINT_HEIGHT_CM = 50;
const PX_PER_CM = PRINT_H / PRINT_HEIGHT_CM;
const Y_BASE = 0.53;
const Y_OFFSET_PX = -25;
const REF_Y = Y_BASE + Y_OFFSET_PX / CANVAS_H;

function readPngRgba(filePath) {
  const buffer = fs.readFileSync(filePath);
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
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const out = Buffer.alloc(width * height * bytesPerPixel);
  let inPos = 0;

  for (let y = 0; y < height; y++) {
    const filter = inflated[inPos++];
    const row = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      row[x] = inflated[inPos++];
    }

    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const curr = out.subarray(y * stride, (y + 1) * stride);

    for (let i = 0; i < stride; i++) {
      const raw = row[i];
      const a = i >= bytesPerPixel ? curr[i - bytesPerPixel] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bytesPerPixel ? prev[i - bytesPerPixel] : 0;
      let v = raw;
      if (filter === 1) v = (raw + a) & 0xff;
      else if (filter === 2) v = (raw + b) & 0xff;
      else if (filter === 3) v = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) v = (raw + paeth(a, b, c)) & 0xff;
      curr[i] = v;
    }
  }

  return { width, height, data: out };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function idx(width, x, y) {
  return (y * width + x) * 4;
}

function detectMode(filePath, data, width, height) {
  if (path.basename(filePath).includes("white")) return "white-shirt";
  let dark = 0;
  let samples = 0;
  for (let y = 400; y < 900; y += 40) {
    for (let x = 200; x < 800; x += 40) {
      const i = idx(width, x, y);
      if (data[i] < 100) dark++;
      samples++;
    }
  }
  return dark / samples > 0.3 ? "dark-shirt" : "white-shirt";
}

function isBackground(r, g, b, a, mode) {
  if (a < 16) return true;
  if (mode === "white-shirt") return r >= 252 && g >= 252 && b >= 252;
  return r >= 248 && g >= 248 && b >= 248;
}

function isShirt(r, g, b, a, mode) {
  return !isBackground(r, g, b, a, mode);
}

function analyze(filePath) {
  const { width, height, data } = readPngRgba(filePath);
  const mode = detectMode(filePath, data, width, height);

  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx(width, x, y);
      if (isShirt(data[i], data[i + 1], data[i + 2], data[i + 3], mode)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const centerX = Math.round((minX + maxX) / 2);

  function collarLowestAt(cx) {
    const yMax = Math.min(height, 450);
    let inGap = false;
    let sawTopRib = false;
    let lowY = null;

    for (let y = minY; y < yMax; y++) {
      const i = idx(width, cx, y);
      const on = isShirt(data[i], data[i + 1], data[i + 2], data[i + 3], mode);
      if (on) {
        if (!sawTopRib) sawTopRib = true;
        else if (inGap) {
          lowY = y;
          break;
        }
      } else if (sawTopRib) {
        inGap = true;
      }
    }

    if (lowY === null) {
      for (let y = minY; y < yMax; y++) {
        const i = idx(width, cx, y);
        if (isShirt(data[i], data[i + 1], data[i + 2], data[i + 3], mode)) {
          lowY = y;
        }
      }
    }
    return lowY;
  }

  const collarSamples = [centerX - 16, centerX - 8, centerX, centerX + 8, centerX + 16]
    .map((cx) => collarLowestAt(cx))
    .filter((y) => y != null);

  const collarLowY = Math.max(...collarSamples);
  const printTopY = REF_Y * CANVAS_H - PRINT_H / 2;
  const printCenterY = REF_Y * CANVAS_H;
  const topOffsetPx = printTopY - collarLowY;
  const centerOffsetPx = printCenterY - collarLowY;

  return {
    file: path.basename(filePath),
    collarLowY,
    printTopY,
    printCenterY,
    topOffsetCm: topOffsetPx / PX_PER_CM,
    centerOffsetCm: centerOffsetPx / PX_PER_CM,
    topOffsetPx,
    centerOffsetPx,
  };
}

function suggestRefY(collarLowY, targetTopCm) {
  const targetTopPx = collarLowY + targetTopCm * PX_PER_CM;
  const refY = (targetTopPx + PRINT_H / 2) / CANVAS_H;
  const offsetPx = (refY - Y_BASE) * CANVAS_H;
  return { targetTopCm, refY, offsetPx };
}

const colors = fs
  .readdirSync(TEMPLATES_DIR)
  .filter((n) => n.match(/^adult-tshirt-.+-front\.png$/))
  .map((n) => n.replace(/^adult-tshirt-(.+)-front\.png$/, "$1"));

const results = colors.map((color) =>
  analyze(path.join(TEMPLATES_DIR, `adult-tshirt-${color}-front.png`)),
);

const avg = (key) =>
  results.reduce((s, r) => s + r[key], 0) / results.length;

const report = {
  system: {
    refY: REF_Y,
    yOffsetPx: Y_OFFSET_PX,
    printTopY: REF_Y * CANVAS_H - PRINT_H / 2,
    printCenterY: REF_Y * CANVAS_H,
    pxPerCm: PX_PER_CM,
    documentedCollarOffsetCm: 10,
  },
  perTemplate: results,
  average: {
    collarLowY: avg("collarLowY"),
    topOffsetCm: avg("topOffsetCm"),
    centerOffsetCm: avg("centerOffsetCm"),
    topOffsetPx: avg("topOffsetPx"),
    centerOffsetPx: avg("centerOffsetPx"),
  },
  standard: { minTopOffsetCm: 7, maxTopOffsetCm: 10, targetMidCm: 8.5 },
  suggestions: {
    for7cm: suggestRefY(avg("collarLowY"), 7),
    for8_5cm: suggestRefY(avg("collarLowY"), 8.5),
    for10cm: suggestRefY(avg("collarLowY"), 10),
  },
};

console.log(JSON.stringify(report, null, 2));
