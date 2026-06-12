#!/usr/bin/env node
/**
 * 驗證印刷區起印：正面 7cm、背面 5cm（領口錨點 + template px/cm）
 */
import assert from "node:assert/strict";

const H = 1536;
const COLLAR_Y = { front: 386, back: 386 };
const PX_PER_CM = 12.24;
const PRINT_H_CM = 50;
const PRINT_H_PX = PRINT_H_CM * PX_PER_CM;

const OFFSET = { front: 7, back: 5 };

function printTopPx(side, collarY = COLLAR_Y[side], scale = 1) {
  return collarY + OFFSET[side] * PX_PER_CM * scale;
}

function printCenterRefY(side, collarY = COLLAR_Y[side], scale = 1) {
  const top = printTopPx(side, collarY, scale);
  return (top + PRINT_H_PX / 2) / H;
}

function scaleY(y, s) {
  const c = H / 2;
  return c + (y - c) * s;
}

// 正面 M：領口下 7cm
const frontTop = printTopPx("front");
const frontTopCm = (frontTop - COLLAR_Y.front) / PX_PER_CM;
assert.ok(
  Math.abs(frontTopCm - 7) < 0.01,
  `正面起印距領口 ${frontTopCm.toFixed(2)} cm ≈ 7 cm`,
);

// 背面 M：領口下 5cm
const backTop = printTopPx("back");
const backTopCm = (backTop - COLLAR_Y.back) / PX_PER_CM;
assert.ok(
  Math.abs(backTopCm - 5) < 0.01,
  `背面起印距領口 ${backTopCm.toFixed(2)} cm ≈ 5 cm`,
);

// 正背面錨點不同
assert.ok(
  Math.abs(printCenterRefY("front") - printCenterRefY("back")) > 0.001,
  "正面與背面 ref.y 不同",
);

// 尺碼 scale：offset 隨 scale
const s = 56 / 50;
const scaledCollar = scaleY(COLLAR_Y.front, s);
const scaledTop = printTopPx("front", scaledCollar, s);
const scaledOffsetCm = (scaledTop - scaledCollar) / PX_PER_CM / s;
assert.ok(
  Math.abs(scaledOffsetCm - 7) < 0.01,
  `XL scale 後仍為 7 cm offset（${scaledOffsetCm.toFixed(2)}）`,
);

// 印刷區高度不變
assert.ok(Math.abs(PRINT_H_PX - 612) < 0.1, `印刷區高 ${PRINT_H_PX}px（50cm）`);

console.log("verify-print-area-offset: OK");
console.log(
  JSON.stringify(
    {
      front: { topPx: frontTop, refY: printCenterRefY("front") },
      back: { topPx: backTop, refY: printCenterRefY("back") },
      printHeightPx: PRINT_H_PX,
    },
    null,
    2,
  ),
);
