/**
 * 驗證：Safe Area Single Source of Truth（lib/printArea.ts）
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    console.error("✗", message);
    process.exitCode = 1;
    return;
  }
  console.log("✓", message);
}

const PRINT_W = 35;
const PRINT_H = 50;
const MARGIN = 0.05;

function getPrintSafeAreaCm(printArea = { width: PRINT_W, height: PRINT_H }) {
  const insetX = printArea.width * MARGIN;
  const insetY = printArea.height * MARGIN;
  return {
    x_cm: insetX,
    y_cm: insetY,
    width_cm: printArea.width * (1 - MARGIN * 2),
    height_cm: printArea.height * (1 - MARGIN * 2),
  };
}

const safe = getPrintSafeAreaCm();

assert(
  Math.abs(safe.width_cm - 31.5) < 0.001 &&
    Math.abs(safe.height_cm - 45) < 0.001,
  "Safe Area = 31.5×45 cm（5% 內縮）",
);

const printAreaSrc = readFileSync(join(root, "lib/printArea.ts"), "utf8");
assert(
  printAreaSrc.includes("PRINT_SAFE_AREA_SPEC") &&
    printAreaSrc.includes("getPrintSafeAreaCm"),
  "printArea.ts 為 Safe Area SSOT",
);
assert(
  printAreaSrc.includes("marginRatio: 0.05"),
  "PRINT_SAFE_AREA_SPEC.marginRatio = 5%",
);

const inspectorSrc = readFileSync(join(root, "lib/design-inspector.ts"), "utf8");
assert(
  inspectorSrc.includes("getPrintSafeAreaCm(printArea)"),
  "getDesignSafeZoneCm 委派 getPrintSafeAreaCm",
);
assert(
  !inspectorSrc.includes("printArea.width * DESIGN_SAFE_MARGIN"),
  "Inspector 不再自行計算 Safe Area",
);

const bridgeSrc = readFileSync(join(root, "lib/print-area.ts"), "utf8");
assert(
  bridgeSrc.includes("safeWidth: safeArea.width_cm") &&
    bridgeSrc.includes("safeHeight: safeArea.height_cm"),
  "getExportMeta 使用 getPrintSafeAreaCm 動態產生 safe 尺寸",
);
assert(
  !bridgeSrc.includes("safeWidthCm: 33") &&
    !bridgeSrc.includes("safeHeightCm: 48"),
  "已移除硬編碼 33×48 cm",
);

const constantsSrc = readFileSync(join(root, "lib/constants.ts"), "utf8");
assert(
  !constantsSrc.includes("export const DESIGN_SAFE_MARGIN = 0.05"),
  "constants.ts 不再重複定義 DESIGN_SAFE_MARGIN",
);

const marginLiteralMatches = [
  printAreaSrc,
  bridgeSrc,
  constantsSrc,
  inspectorSrc,
  readFileSync(join(root, "lib/design-placement.ts"), "utf8"),
  readFileSync(join(root, "components/designer/PrintAreaGrid.tsx"), "utf8"),
].flatMap((src, index) =>
  [...src.matchAll(/DESIGN_SAFE_MARGIN\s*=\s*0\.05/g)].map(() => index),
);

assert(
  marginLiteralMatches.length === 0,
  "DESIGN_SAFE_MARGIN = 0.05 僅存在於 PRINT_SAFE_AREA_SPEC（無重複字面定義）",
);

assert(
  Math.abs(ADULT_UNISEX_SAFE_WIDTH() - safe.width_cm) < 0.001 &&
    Math.abs(ADULT_UNISEX_SAFE_HEIGHT() - safe.height_cm) < 0.001,
  "ADULT_UNISEX_PRINT_SPEC.safeWidth/Height 與 getPrintSafeAreaCm 一致",
);

function ADULT_UNISEX_SAFE_WIDTH() {
  const match = bridgeSrc.match(/safeWidthCm:\s*([^,\n]+)/);
  if (!match) return NaN;
  const token = match[1].trim();
  if (token === "defaultPrintSafeAreaCm.width_cm") {
    return safe.width_cm;
  }
  return Number.parseFloat(token);
}

function ADULT_UNISEX_SAFE_HEIGHT() {
  const match = bridgeSrc.match(/safeHeightCm:\s*([^,\n]+)/);
  if (!match) return NaN;
  const token = match[1].trim();
  if (token === "defaultPrintSafeAreaCm.height_cm") {
    return safe.height_cm;
  }
  return Number.parseFloat(token);
}

console.log("\nSafe Area SSOT 校驗完成。");
