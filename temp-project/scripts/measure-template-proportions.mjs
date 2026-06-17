#!/usr/bin/env node
/**
 * 量測 adult-tshirt 模板：腋下胸寬、HPS→下擺衣長、胸寬/衣長比例
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
const THEORY_RATIO = M_CHEST_CM / M_LENGTH_CM;
const CODEBASE_CHEST_PX = 612;

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

function isShirt(data, w, x, y) {
  const i = idx(w, x, y);
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const a = data[i + 3];
  if (a < 16) return false;
  return !(r >= 248 && g >= 248 && b >= 248);
}

function rowSpan(data, w, y, x0, x1) {
  let left = null;
  let right = null;
  for (let x = x0; x <= x1; x++) {
    if (!isShirt(data, w, x, y)) continue;
    if (left === null) left = x;
    right = x;
  }
  if (left === null) return null;
  return { left, right, width: right - left + 1 };
}

/** 軀幹內腋下：左半最靠中心、右半最靠中心的 shirt 像素 */
function torsoChestAtY(data, w, y, centerX) {
  let leftArmpit = null;
  for (let x = 0; x <= centerX; x++) {
    if (isShirt(data, w, x, y)) leftArmpit = x;
  }
  let rightArmpit = null;
  for (let x = w - 1; x >= centerX; x--) {
    if (isShirt(data, w, x, y)) rightArmpit = x;
  }
  if (leftArmpit == null || rightArmpit == null || rightArmpit <= leftArmpit) {
    return null;
  }
  return {
    y,
    leftArmpit,
    rightArmpit,
    chestWidthPx: rightArmpit - leftArmpit,
  };
}

function shoulderPoint(data, w, minX, maxX, minY, maxY, side) {
  const pad = Math.round((maxX - minX) * 0.2);
  const xFrom = side === "left" ? minX : maxX - pad;
  const xTo = side === "left" ? minX + pad : maxX;
  const yTo = minY + Math.round((maxY - minY) * 0.28);
  let best = null;
  for (let x = xFrom; x <= xTo; x++) {
    for (let y = minY; y <= yTo; y++) {
      if (!isShirt(data, w, x, y)) continue;
      if (
        !best ||
        y < best.y ||
        (y === best.y && (side === "left" ? x < best.x : x > best.x))
      ) {
        best = { x, y };
      }
    }
  }
  return best;
}

function analyze(fp) {
  const { width, height, data } = readPngRgba(fp);

  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isShirt(data, width, x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const centerX = Math.round((minX + maxX) / 2);
  const leftShoulder = shoulderPoint(data, width, minX, maxX, minY, maxY, "left");
  const rightShoulder = shoulderPoint(
    data,
    width,
    minX,
    maxX,
    minY,
    maxY,
    "right",
  );

  const hpsY = Math.min(leftShoulder?.y ?? minY, rightShoulder?.y ?? minY);
  const hemY = maxY;
  const bodyLengthPx = hemY - hpsY;

  const profile = [];
  for (let y = minY; y <= maxY; y++) {
    const outer = rowSpan(data, width, y, minX, maxX);
    const torso = torsoChestAtY(data, width, y, centerX);
    if (outer) {
      profile.push({
        y,
        outerWidth: outer.width,
        torsoWidth: torso?.chestWidthPx ?? null,
      });
    }
  }

  const yStart = minY + Math.round((maxY - minY) * 0.24);
  const yEnd = minY + Math.round((maxY - minY) * 0.4);
  const armpitCandidates = profile.filter(
    (p) => p.y >= yStart && p.y <= yEnd && p.torsoWidth != null,
  );

  let armpitByMinTorso = null;
  for (const row of armpitCandidates) {
    if (!armpitByMinTorso || row.torsoWidth < armpitByMinTorso.torsoWidth) {
      armpitByMinTorso = row;
    }
  }

  const armpitBy612 = armpitCandidates.reduce((best, row) => {
    const d = Math.abs(row.torsoWidth - CODEBASE_CHEST_PX);
    if (!best || d < best.delta) return { ...row, delta: d };
    return best;
  }, null);

  const yFrac32 = minY + Math.round((maxY - minY) * 0.32);
  const armpitAt32 = torsoChestAtY(data, width, yFrac32, centerX);

  const chestPick = armpitBy612 ?? {
    y: armpitAt32?.y,
    torsoWidth: armpitAt32?.chestWidthPx,
    method: "32% fallback",
  };

  const chestWidthPx = chestPick.torsoWidth ?? chestPick.chestWidthPx;
  const armpitY = chestPick.y;
  const armpitDetail = torsoChestAtY(data, width, armpitY, centerX);

  const templateRatio = chestWidthPx / bodyLengthPx;
  const ratioErrorPct = ((templateRatio - THEORY_RATIO) / THEORY_RATIO) * 100;
  const pxPerCmChest = chestWidthPx / M_CHEST_CM;
  const pxPerCmLength = bodyLengthPx / M_LENGTH_CM;
  const scaleSkewPct = ((pxPerCmLength - pxPerCmChest) / pxPerCmChest) * 100;

  const uniformLengthPx = chestWidthPx * (M_LENGTH_CM / M_CHEST_CM);
  const verticalStretchVsUniformPct =
    ((bodyLengthPx - uniformLengthPx) / uniformLengthPx) * 100;

  return {
    file: path.basename(fp),
    canvas: { width, height },
    shirtBBox: {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    },
    hps: {
      y: hpsY,
      leftShoulder,
      rightShoulder,
    },
    hemY,
    armpit: {
      y: armpitY,
      leftArmpit: armpitDetail?.leftArmpit,
      rightArmpit: armpitDetail?.rightArmpit,
      chestWidthPx,
      selectionMethod:
        armpitBy612 != null
          ? "腋下帶(24–40%衣長)內 torso 寬度最接近 612px 之列"
          : "32% 衣長 fallback",
    },
    measurements: {
      chestWidthPx,
      bodyLengthPx,
      templateRatio: Number(templateRatio.toFixed(4)),
    },
    reference: {
      mChestCm: M_CHEST_CM,
      mLengthCm: M_LENGTH_CM,
      theoryRatio: Number(THEORY_RATIO.toFixed(4)),
    },
    comparison: {
      ratioErrorPct: Number(ratioErrorPct.toFixed(2)),
      pxPerCmFromChest: Number(pxPerCmChest.toFixed(3)),
      pxPerCmFromLength: Number(pxPerCmLength.toFixed(3)),
      scaleSkewPct: Number(scaleSkewPct.toFixed(2)),
      uniformLengthPxAtChestScale: Number(uniformLengthPx.toFixed(1)),
      verticalStretchVsUniformPct: Number(verticalStretchVsUniformPct.toFixed(2)),
      codebaseChestPx: CODEBASE_CHEST_PX,
      chestPxDelta: chestWidthPx - CODEBASE_CHEST_PX,
    },
    widthProfileSamples: [
      profile.find((p) => p.y === yStart),
      profile.find((p) => p.y === yFrac32),
      profile.find((p) => p.y === yEnd),
      profile.reduce((a, b) =>
        a && a.torsoWidth > (b.torsoWidth ?? 0) ? a : b,
      ),
    ].filter(Boolean),
  };
}

const result = analyze(path.resolve(filePath));
console.log(JSON.stringify(result, null, 2));
