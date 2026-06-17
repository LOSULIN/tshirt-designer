/**
 * 驗證：平面模板 PNG 與印刷區 overlay 對位（不透明區域 vs PRINT_REFERENCE）。
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const TEMPLATES_DIR = join(ROOT, "public", "templates");

const COLORS = [
  "white",
  "black",
  "heather-grey",
  "navy",
  "royal-blue",
  "sky-blue",
  "pink",
  "hot-pink",
  "light-yellow",
  "mustard-green",
];

const SIDES = ["front", "back"];
const CANVAS_W = 1024;
const CANVAS_H = 1536;
const UI_GLOBAL_PRINT_OFFSET_Y_PX = -25;
const PRINT_REF_Y = 0.53 + UI_GLOBAL_PRINT_OFFSET_Y_PX / CANVAS_H;

const PRINT_REFERENCE_BY_SIDE = {
  front: { x: 0.5, y: PRINT_REF_Y },
  back: { x: 0.5, y: PRINT_REF_Y },
};
const PRINT_W = 350;
const PRINT_H = 500;

function idx(w, x, y) {
  return (y * w + x) * 4;
}

function analyzeTemplate(filePath) {
  const buffer = readFileSync(filePath);
  const w = buffer.readUInt32BE(16);
  const h = buffer.readUInt32BE(20);
  let minY = h;
  let maxY = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (buffer[idx(w, x, y) + 3] > 32) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const midY = Math.round((minY + maxY) / 2);
  return { width: w, height: h, minY, maxY, midY, span: maxY - minY + 1 };
}

function printAreaRect(side) {
  const ref = PRINT_REFERENCE_BY_SIDE[side];
  const cx = Math.round(ref.x * CANVAS_W);
  const cy = Math.round(ref.y * CANVAS_H);
  return {
    l: cx - PRINT_W / 2,
    t: cy - PRINT_H / 2,
    r: cx + PRINT_W / 2,
    b: cy + PRINT_H / 2,
    cx,
    cy,
  };
}

function overlapPct(shirt, pa) {
  const overlapW = Math.max(0, Math.min(CANVAS_W - 1, pa.r) - Math.max(0, pa.l));
  const overlapH = Math.max(0, Math.min(shirt.maxY, pa.b) - Math.max(shirt.minY, pa.t));
  return Math.round(((overlapW * overlapH) / (PRINT_W * PRINT_H)) * 100);
}

let failed = false;
let warned = false;

console.log("模板對位檢查：public/templates/adult-tshirt-{color}-{side}.png\n");

for (const side of SIDES) {
  const pa = printAreaRect(side);
  const mids = [];

  for (const color of COLORS) {
    const file = `adult-tshirt-${color}-${side}.png`;
    const path = join(TEMPLATES_DIR, file);

    if (!existsSync(path)) {
      console.log(`✗ 缺少 ${file}`);
      failed = true;
      continue;
    }

    const shirt = analyzeTemplate(path);
    mids.push(shirt.midY);

    if (shirt.width !== CANVAS_W || shirt.height !== CANVAS_H) {
      console.log(
        `⚠ ${file} 畫布 ${shirt.width}×${shirt.height}（預期 ${CANVAS_W}×${CANVAS_H}）`,
      );
      warned = true;
    }

    const overlap = overlapPct(shirt, pa);
    const refY = +(shirt.midY / CANVAS_H).toFixed(4);
    const delta = Math.abs(refY - PRINT_REFERENCE_BY_SIDE[side].y);

    if (overlap < 40) {
      console.log(
        `⚠ ${file} 印刷區重疊偏低 ${overlap}% · 衣服 y=${shirt.minY}~${shirt.maxY} · 建議 refY≈${refY}`,
      );
      warned = true;
    } else {
      console.log(
        `✓ ${file} 重疊 ${overlap}% · 衣服跨度 ${shirt.span}px · refY≈${refY}`,
      );
    }

    if (delta > 0.03) {
      console.log(
        `  ↳ 與 PRINT_REFERENCE_BY_SIDE.${side}.y=${PRINT_REFERENCE_BY_SIDE[side].y} 偏差 ${delta.toFixed(3)}`,
      );
    }
  }

  const avgMid = Math.round(mids.reduce((a, b) => a + b, 0) / mids.length);
  console.log(
    `\n${side} 平均衣服中心 y=${avgMid}（refY≈${(avgMid / CANVAS_H).toFixed(4)}）· 系統 ${PRINT_REFERENCE_BY_SIDE[side].y}\n`,
  );
}

const legacy = readdirSync(TEMPLATES_DIR).filter(
  (name) =>
    /^(adult-male|adult-female|child-male|child-female)-/.test(name) &&
    name.endsWith(".png"),
);

if (legacy.length > 0) {
  console.log("模特／舊版模板（設計畫布不使用顏色模板者仍會引用）：");
  for (const name of legacy) {
    console.log(`  - ${name}`);
  }
  warned = true;
}

console.log("");

if (failed) {
  process.exit(1);
}

if (warned) {
  console.log("模板對位檢查完成（含警告）。");
  process.exit(0);
}

console.log("模板對位檢查通過。");
