/**
 * 驗證推薦版型：尺寸、面向、領口基準定位、模板外框尺寸。
 */

const PRINT_AREA_OFFSET_CM = { front: 7, back: 5 };
const GARMENT_MAX = { front: { w: 35, h: 50 }, back: { w: 38, h: 45 } };
const LEFT_CHEST_OFFSET = 8;
const LEFT_CHEST_COLLAR_TOP = 9;
const LEFT_CHEST_TEXT_COLLAR_TOP = 15;
const BACK_UPPER_COLLAR_TOP = 7;
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
    w: 6,
    h: 6,
    ax: centerX("front") + LEFT_CHEST_OFFSET,
    ay: anchorY("front", LEFT_CHEST_COLLAR_TOP, 6),
    orientation: "square",
  },
  {
    id: "left-chest-text",
    sides: ["front"],
    w: 10,
    h: 3,
    ax: centerX("front") + LEFT_CHEST_OFFSET,
    ay: anchorY("front", LEFT_CHEST_TEXT_COLLAR_TOP, 3),
    orientation: "landscape",
  },
  {
    id: "center-chest-text",
    sides: ["front"],
    w: 29,
    h: 10,
    ax: centerX("front"),
    ay: anchorY("front", PRINT_AREA_OFFSET_CM.front, 10),
    orientation: "landscape",
  },
  {
    id: "center-chest-logo",
    sides: ["front"],
    w: 25,
    h: 25,
    ax: centerX("front"),
    ay: anchorY("front", PRINT_AREA_OFFSET_CM.front, 25),
    orientation: "square",
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
    orientation: "landscape",
  },
  {
    id: "back-center-a4-portrait",
    sides: ["back"],
    w: 21,
    h: 29.7,
    ax: centerX("back"),
    ay: anchorY("back", BACK_UPPER_COLLAR_TOP, 29.7),
    orientation: "portrait",
  },
  {
    id: "back-center-a3-portrait",
    sides: ["back"],
    w: 29.7,
    h: 42,
    ax: centerX("back"),
    ay: anchorY("back", BACK_UPPER_COLLAR_TOP, 42),
    orientation: "portrait",
  },
  {
    id: "back-center-25",
    sides: ["back"],
    w: 25,
    h: 25,
    ax: centerX("back"),
    ay: GARMENT_MAX.back.h / 2,
    orientation: "square",
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

if (PRESETS.length !== 10) {
  console.error("✗ 應有 10 個版型");
  failed = true;
}

const front = PRESETS.filter((p) => p.sides.includes("front"));
const back = PRESETS.filter((p) => p.sides.includes("back"));
if (front.length !== 6 || back.length !== 4) {
  console.error("✗ 正面 6 / 背面 4 個版型");
  failed = true;
}

if (PRESETS.some((p) => p.id === "back-collar-tag")) {
  console.error("✗ 不應包含後領小標版型");
  failed = true;
}

const leftLogo = PRESETS.find((x) => x.id === "left-chest-logo");
if (leftLogo.w !== 6 || leftLogo.h !== 6) {
  console.error("✗ 左胸 LOGO 應為 6×6 cm");
  failed = true;
}

const a4p = PRESETS.find((x) => x.id === "center-chest-a4-portrait");
const a4l = PRESETS.find((x) => x.id === "center-chest-a4-landscape");
if (a4p.w >= a4p.h || a4l.w <= a4l.h) {
  console.error("✗ A4 直式應高>寬、橫式應寬>高");
  failed = true;
}

const backText = targetRect(PRESETS.find((x) => x.id === "back-center-text"));
const backA4 = targetRect(PRESETS.find((x) => x.id === "back-center-a4-portrait"));
const backA3 = targetRect(PRESETS.find((x) => x.id === "back-center-a3-portrait"));
if (Math.abs(backText.y - backA4.y) > 0.001) {
  console.error("✗ 背面 A4 應與 30×12 相同上緣");
  failed = true;
}
if (Math.abs(backText.y - backA3.y) > 0.001) {
  console.error("✗ 背面 A3 應與 30×12 相同上緣");
  failed = true;
}
if (backA4.h <= backA4.w) {
  console.error("✗ 背面 A4 框應為直式（高>寬）");
  failed = true;
}
if (backA3.h <= backA3.w) {
  console.error("✗ 背面 A3 框應為直式（高>寬）");
  failed = true;
}

const backA3Preset = PRESETS.find((x) => x.id === "back-center-a3-portrait");
if (backA3Preset.w !== 29.7 || backA3Preset.h !== 42) {
  console.error("✗ 背面 A3 應為 29.7×42 cm");
  failed = true;
}

const back25 = PRESETS.find((x) => x.id === "back-center-25");
if (back25.w !== 25 || back25.h !== 25) {
  console.error("✗ 背面 25×25 尺寸錯誤");
  failed = true;
}

if (a4p.orientation !== "portrait" || a4l.orientation !== "landscape") {
  console.error("✗ A4 版型 orientation 應為 portrait / landscape");
  failed = true;
}

const backA4Preset = PRESETS.find((x) => x.id === "back-center-a4-portrait");
if (backA4Preset.orientation !== "portrait") {
  console.error("✗ 背面 A4 orientation 應為 portrait");
  failed = true;
}

if (backA3Preset.orientation !== "portrait") {
  console.error("✗ 背面 A3 orientation 應為 portrait");
  failed = true;
}

if (!failed) {
  console.log("✓ 10 個版型定義正確（正面 6 / 背面 4）");
  console.log("✓ 背面 A3 直式 29.7×42 與背面文字上緣對齊");
}

if (failed) process.exit(1);
console.log("\n版型 Preset 驗證完成。");
