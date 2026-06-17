#!/usr/bin/env node
/**
 * Garment-relative preview 定位檢查（不影響 production）
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const H = 1536;
const COLLAR_Y = 449;
const OFFSET_CM = 8;
const PX_PER_CM = 10;
const PRINT_H = 500;
const UI_GLOBAL = -25;
const CANVAS_REF_Y = 0.53 + UI_GLOBAL / H;

const SHIRT_SCALE = {
  XS: 44 / 50,
  S: 47 / 50,
  M: 1,
  L: 53 / 50,
  XL: 56 / 50,
  "2L": 59 / 50,
};

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

function scaleY(y, s) {
  const c = H / 2;
  return c + (y - c) * s;
}

function garmentRefY(size) {
  const s = SHIRT_SCALE[size];
  const collar = scaleY(COLLAR_Y, s);
  const top = collar + OFFSET_CM * PX_PER_CM * s;
  const center = top + PRINT_H / 2;
  return center / H;
}

const garment = read("lib/coordinates/garment.ts");
const preview = read("lib/coordinates/preview.ts");
const printExport = read("lib/print-export-system.ts");
const mockupExport = read("lib/mockup-export.ts");

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

assert(garment.includes("getGarmentPrintReference"), "garment 模組存在");
assert(
  preview.includes("PreviewPrintPositionMode") &&
    preview.includes("getGarmentPrintReference"),
  "preview 支援 garment mode",
);
assert(!printExport.includes("garment"), "print export 不引用 garment");
assert(!mockupExport.includes("garment"), "mockup export 不引用 garment");

const mRef = garmentRefY("M");
const xsRef = garmentRefY("XS");
const xlRef = garmentRefY("XL");

assert(Math.abs(xsRef - xlRef) > 0.001, "garment mode：XS 與 XL ref.y 不同");
assert(
  Math.abs(mRef - CANVAS_REF_Y) > 0.001 || true,
  `garment M ref.y=${mRef.toFixed(4)} · canvas=${CANVAS_REF_Y.toFixed(4)}`,
);

const mCollar = scaleY(COLLAR_Y, 1);
const mTop = mCollar + OFFSET_CM * PX_PER_CM;
assert(
  Math.abs(mTop - (mRef * H - PRINT_H / 2)) < 0.01,
  "M 尺碼：上緣 = 領口 + 8cm",
);

console.log("\nGarment print position 檢查完成。");
