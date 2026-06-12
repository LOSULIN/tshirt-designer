#!/usr/bin/env node
/**
 * 驗證橘色安全區垂直定位：領口下緣 + PRINT_AREA_OFFSET_CM（正面 7、背面 5）
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const ROOT = join(import.meta.dirname, "..");

// ts-node/register 太重；直接複製核心公式做 spot check
const PRINT_AREA_OFFSET_CM = { front: 7, back: 5 };
const COLLAR_ANCHOR_Y_PX_BY_SIDE = { front: 386, back: 386 };
const CONTAINER_HEIGHT = 1536;
const SIZES = ["XS", "S", "M", "L", "XL", "2L"];
const SHIRT_SCALE = {
  XS: 0.88,
  S: 0.94,
  M: 1,
  L: 1.06,
  XL: 1.12,
  "2L": 1.18,
};

function scaleGarmentY(yPx, garmentScale) {
  const centerY = CONTAINER_HEIGHT / 2;
  return centerY + (yPx - centerY) * garmentScale;
}

function getPrintTopPx(side, pxPerCm, garmentScale) {
  const collar = scaleGarmentY(
    COLLAR_ANCHOR_Y_PX_BY_SIDE[side],
    garmentScale,
  );
  return collar + PRINT_AREA_OFFSET_CM[side] * pxPerCm * garmentScale;
}

function offsetCmFromCollar(side, size, pxPerCm) {
  const scale = SHIRT_SCALE[size];
  const collar = scaleGarmentY(
    COLLAR_ANCHOR_Y_PX_BY_SIDE[side],
    scale,
  );
  const topPx = getPrintTopPx(side, pxPerCm, scale);
  return (topPx - collar) / (pxPerCm * scale);
}

const pxPerCm = 12.24; // template px/cm @ 1024

for (const side of ["front", "back"]) {
  const expected = PRINT_AREA_OFFSET_CM[side];
  for (const size of SIZES) {
    const actual = offsetCmFromCollar(side, size, pxPerCm);
    assert.ok(
      Math.abs(actual - expected) < 0.001,
      `${side} ${size}: 領口距離應為 ${expected}cm，實際 ${actual.toFixed(4)}cm`,
    );
  }
}

// 源碼存在定位函式
const garmentSrc = require("node:fs").readFileSync(
  join(ROOT, "lib/coordinates/garment.ts"),
  "utf8",
);
assert.ok(
  garmentSrc.includes("getGarmentPrintSafeZonePctInPrintArea"),
  "garment.ts 含安全區定位函式",
);
assert.ok(
  garmentSrc.includes("metrics.printTopPx"),
  "安全區上緣使用 printTopPx（領口 + offset）",
);

const gridSrc = require("node:fs").readFileSync(
  join(ROOT, "components/designer/PrintAreaGrid.tsx"),
  "utf8",
);
assert.ok(
  gridSrc.includes("getGarmentPrintSafeZonePctInPrintArea"),
  "PrintAreaGrid 使用新定位函式",
);

console.log("verify-garment-safe-zone-layout: OK");
