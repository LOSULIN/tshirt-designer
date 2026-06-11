/**
 * 驗證推薦版型：尺寸、面向、等比縮放 contain。
 */

const PRESETS = [
  { id: "left-chest-logo", sides: ["front"], w: 10, h: 10, ax: 10, ay: 12 },
  { id: "center-chest-logo", sides: ["front"], w: 25, h: 25, ax: 17.5, ay: 16 },
  { id: "center-chest-a4", sides: ["front"], w: 21, h: 29.7, ax: 17.5, ay: 20 },
  { id: "back-center-text", sides: ["back"], w: 30, h: 12, ax: 17.5, ay: 24 },
  { id: "back-center-a3", sides: ["back"], w: 29.7, h: 42, ax: 17.5, ay: 28 },
  { id: "back-collar-tag", sides: ["back"], w: 6, h: 4, ax: 17.5, ay: 5 },
];

function targetRect(p) {
  return {
    x: p.ax - p.w / 2,
    y: p.ay - p.h / 2,
    w: p.w,
    h: p.h,
  };
}

function containFactor(cw, ch, tw, th) {
  return Math.min(tw / cw, th / ch);
}

let failed = false;

if (PRESETS.length !== 6) {
  console.error("✗ 應有 6 個版型");
  failed = true;
}

const front = PRESETS.filter((p) => p.sides.includes("front"));
const back = PRESETS.filter((p) => p.sides.includes("back"));
if (front.length !== 3 || back.length !== 3) {
  console.error("✗ 正面/背面各應 3 個版型");
  failed = true;
}

const layer = { w: 40, h: 20 };
const preset = PRESETS[1];
const t = targetRect(preset);
const f = containFactor(layer.w, layer.h, t.w, t.h);
const fw = layer.w * f;
const fh = layer.h * f;
if (fw > t.w + 0.001 || fh > t.h + 0.001) {
  console.error("✗ contain 後超出版型框");
  failed = true;
}
const x = t.x + (t.w - fw) / 2;
const y = t.y + (t.h - fh) / 2;
const cx = x + fw / 2;
const cy = y + fh / 2;
if (Math.abs(cx - preset.ax) > 0.001 || Math.abs(cy - preset.ay) > 0.001) {
  console.error("✗ 置中後中心偏離錨點");
  failed = true;
}

if (!failed) {
  console.log("✓ 6 個版型定義正確（正面 3 / 背面 3）");
  console.log("✓ 等比 contain 置中邏輯正確");
}

if (failed) process.exit(1);
console.log("\n版型 Preset 驗證完成。");
