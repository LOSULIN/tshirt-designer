/**
 * 分析 1024×1536 成人 T 恤模板 PNG（白底不透明 PNG，以色彩分割衣服）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultPath = path.join(
  __dirname,
  "../public/templates/adult-tshirt-black-front.png",
);

function idx(width, x, y) {
  return (y * width + x) * 4;
}

function loadPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

/** 白底 JPG/PNG：接近純白視為背景 */
function isBackground(r, g, b, a, mode) {
  if (a < 16) return true;
  if (mode === "white-shirt") {
    return r >= 252 && g >= 252 && b >= 252;
  }
  return r >= 248 && g >= 248 && b >= 248;
}

function detectMode(filePath, data, width, height) {
  if (filePath.includes("white")) return "white-shirt";
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

function isShirt(r, g, b, a, mode) {
  return !isBackground(r, g, b, a, mode);
}

function analyze(filePath) {
  const png = loadPng(filePath);
  const { width, height, data } = png;
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

  /** 中心線領口最低點：領窩 U 形內最下方的衣服像素 */
  function collarLowestAt(cx) {
    const yMax = Math.min(height, 450);
    let inGap = false;
    let sawTopRib = false;
    let lowY = null;

    for (let y = minY; y < yMax; y++) {
      const i = idx(width, cx, y);
      const on = isShirt(data[i], data[i + 1], data[i + 2], data[i + 3], mode);

      if (on) {
        if (!sawTopRib) {
          sawTopRib = true;
        } else if (inGap) {
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

  /** 肩點：上 1/3 外側轮廓最高點（最小 y） */
  function shoulderPoint(side) {
    const pad = Math.round((maxX - minX) * 0.2);
    const xFrom = side === "left" ? minX : maxX - pad;
    const xTo = side === "left" ? minX + pad : maxX;
    const yTo = minY + Math.round((maxY - minY) * 0.28);

    let best = null;
    for (let x = xFrom; x <= xTo; x++) {
      for (let y = minY; y <= yTo; y++) {
        const i = idx(width, x, y);
        if (!isShirt(data[i], data[i + 1], data[i + 2], data[i + 3], mode)) {
          continue;
        }
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

  const collarYs = [centerX - 16, centerX - 8, centerX, centerX + 8, centerX + 16]
    .map((cx) => ({ cx, y: collarLowestAt(cx) }))
    .filter((s) => s.y != null);

  const collarLowY = Math.max(...collarYs.map((s) => s.y));
  const collarLowX =
    collarYs.find((s) => s.y === collarLowY)?.cx ?? centerX;

  const leftShoulder = shoulderPoint("left");
  const rightShoulder = shoulderPoint("right");

  const SYSTEM_ASSUMED_COLLAR_Y = 0;
  const SYSTEM_PRINT_TOP_Y = 300;

  return {
    file: path.basename(filePath),
    segmentationMode: mode,
    canvas: { width, height },
    shirtBBox: { minX, minY, maxX, maxY },
    chestCenterLineX: centerX,
    collarLowestPoint: { x: collarLowX, y: collarLowY, samples: collarYs },
    leftShoulderPoint: leftShoulder,
    rightShoulderPoint: rightShoulder,
    systemOffset: {
      assumedCollarBaselineY: SYSTEM_ASSUMED_COLLAR_Y,
      frontPrintAreaTopY: SYSTEM_PRINT_TOP_Y,
      actualCollarLowY: collarLowY,
      deltaAssumedBaselineToActualCollarLowPx:
        collarLowY - SYSTEM_ASSUMED_COLLAR_Y,
      deltaPrintTopToActualCollarLowPx: SYSTEM_PRINT_TOP_Y - collarLowY,
    },
  };
}

const files = process.argv.slice(2);
const targets =
  files.length > 0
    ? files
    : [
        "public/templates/adult-tshirt-black-front.png",
        "public/templates/adult-tshirt-white-front.png",
        "public/templates/adult-tshirt-black-back.png",
      ];

for (const f of targets) {
  const abs = path.isAbsolute(f) ? f : path.join(process.cwd(), f);
  console.log(JSON.stringify(analyze(abs), null, 2));
  console.log("---");
}
