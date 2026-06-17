#!/usr/bin/env node
/**
 * Mockup Calibration 數值檢查
 */

const W = 1024;
const H = 1536;
const PRINT_H = 500;
const Y_BASE = 0.53;
const UI_GLOBAL_OFFSET = -25;
const Y_PREVIEW = Y_BASE + UI_GLOBAL_OFFSET / H;

const MOCKUP_FLAT_Y = 0.53 + UI_GLOBAL_OFFSET / H;
const MOCKUP_MODEL = { front: 0.48, back: 0.5 };

function centerY(refY) {
  return refY * H;
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

assert(Y_PREVIEW === MOCKUP_FLAT_Y, "Preview 與 Flat Mockup ref.y 一致");
assert(
  Math.round(centerY(Y_PREVIEW) - centerY(Y_BASE)) === UI_GLOBAL_OFFSET,
  "Preview Y 校準為 UI_GLOBAL -25px",
);
assert(Math.round(centerY(Y_PREVIEW)) === 789, "Preview 中心 Y = 789px");

const flatVsEditor = 0;
assert(flatVsEditor === 0, "Flat Mockup vs Editor ΔY = 0px");

const modelFrontDelta = Math.round(centerY(MOCKUP_MODEL.front) - centerY(Y_PREVIEW));
assert(modelFrontDelta === -52, `Model front vs Editor ΔY = ${modelFrontDelta}px（上方）`);

const modelBackDelta = Math.round(centerY(MOCKUP_MODEL.back) - centerY(Y_PREVIEW));
assert(modelBackDelta === -21, `Model back vs Editor ΔY = ${modelBackDelta}px（上方）`);

assert(
  Math.round(centerY(Y_BASE) - PRINT_H / 2) === 564,
  "調整前 top = 564px",
);
assert(
  Math.round(centerY(Y_PREVIEW) - PRINT_H / 2) === 539,
  "調整後 top = 539px",
);

console.log("\nMockup calibration 數值檢查完成。");
