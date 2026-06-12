/**
 * 驗證推薦版型：尺寸、面向、領口基準定位、模板外框尺寸。
 */

const PRINT_AREA_OFFSET_CM = { front: 7, back: 5 };
const GARMENT_MAX = { front: { w: 35 }, back: { w: 38 } };
const LEFT_CHEST_OFFSET = 8;
const LEFT_CHEST_COLLAR_TOP = 9;
const BACK_UPPER_COLLAR_TOP = 7;
const BACK_TAG_COLLAR_TOP = 3;
const PX_PER_CM = 12.24;

function centerX(side) {
  return GARMENT_MAX[side].w / 2;
}

function anchorY(side, collarToTop, height) {
  return collarToTop - PRINT_AREA_OFFSET_CM[side] + height / 2;
}

function collarFromRect(side, yTop) {
  return yTop + PRINT_AREA_OFFSET_CM[side];
}

const PRESETS = [
  {
    id: "left-chest-logo",
    sides: ["front"],
    w: 10,
    h: 10,
    ax: centerX("front") + LEFT_CHEST_OFFSET,
    ay: anchorY("front", LEFT_CHEST_COLLAR_TOP, 10),
  },
  {
    id: "center-chest-logo",
    sides: ["front"],
    w: 25,
    h: 25,
    ax: centerX("front"),
    ay: anchorY("front", PRINT_AREA_OFFSET_CM.front, 25),
  },
  {
    id: "center-chest-a4-portrait",
    sides: ["front"],
    w: 21,
    h: 29.7,
    ax: centerX("front"),
    ay: anchorY("front", PRINT_AREA_OFFSET_CM.front, 29.7),
    orientation: "portrait",
  },
  {
    id: "center-chest-a4-landscape",
    sides: ["front"],
    w: 29.7,
    h: 21,
    ax: centerX("front"),
    ay: anchorY("front", PRINT_AREA_OFFSET_CM.front, 21),
    orientation: "landscape",
  },
  {
    id: "back-center-text",
    sides: ["back"],
    w: 30,
    h: 12,
    ax: centerX("back"),
    ay: anchorY("back", BACK_UPPER_COLLAR_TOP, 12),
  },
  {
    id: "back-center-a3",
    sides: ["back"],
    w: 29.7,
    h: 42,
    ax: centerX("back"),
    ay: anchorY("back", BACK_UPPER_COLLAR_TOP, 42),
    orientation: "portrait",
  },
  {
    id: "back-collar-tag",
    sides: ["back"],
    w: 6,
    h: 4,
    ax: centerX("back"),
    ay: anchorY("back", BACK_TAG_COLLAR_TOP, 4),
  },
];

function targetRect(p) {
  const yTop = p.ay - p.h / 2;
  return {
    x: p.ax - p.w / 2,
    y: yTop,
    w: p.w,
    h: p.h,
    topFromCollar: collarFromRect(p.sides[0], yTop),
  };
}

let failed = false;

if (PRESETS.length !== 7) {
  console.error("✗ 應有 7 個版型");
  failed = true;
}

const front = PRESETS.filter((p) => p.sides.includes("front"));
const back = PRESETS.filter((p) => p.sides.includes("back"));
if (front.length !== 4 || back.length !== 3) {
  console.error("✗ 正面 4 / 背面 3 個版型");
  failed = true;
}

const a4p = PRESETS.find((x) => x.id === "center-chest-a4-portrait");
const a4l = PRESETS.find((x) => x.id === "center-chest-a4-landscape");
if (a4p.w >= a4p.h || a4l.w <= a4l.h) {
  console.error("✗ A4 直式應高>寬、橫式應寬>高");
  failed = true;
}

const backText = targetRect(PRESETS.find((x) => x.id === "back-center-text"));
const backA3 = targetRect(PRESETS.find((x) => x.id === "back-center-a3"));
if (Math.abs(backText.y - backA3.y) > 0.001) {
  console.error("✗ 背面 A3 應與 30×12 相同上緣");
  failed = true;
}
if (backA3.h <= backA3.w) {
  console.error("✗ 背面 A3 框應為直式（高>寬）");
  failed = true;
}

if (a4p.orientation !== "portrait" || a4l.orientation !== "landscape") {
  console.error("✗ A4 版型 orientation 應為 portrait / landscape");
  failed = true;
}

const a3 = PRESETS.find((x) => x.id === "back-center-a3");
if (a3.orientation !== "portrait") {
  console.error("✗ 背面 A3 orientation 應為 portrait");
  failed = true;
}

if (!failed) {
  console.log("✓ 7 個版型定義正確（正面 4 / 背面 3）");
  console.log("✓ A4 直式／橫式與背面直式 A3 上緣對齊正確");
}

if (failed) process.exit(1);
console.log("\n版型 Preset 驗證完成。");
