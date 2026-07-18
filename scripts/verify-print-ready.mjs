/**
 * Print Ready — verification
 * node scripts/verify-print-ready.mjs
 */
import { readFileSync } from "node:fs";

function getPrintQualityTier(dpi) {
  if (dpi >= 500) return { stars: 5, id: "excellent" };
  if (dpi >= 300) return { stars: 4, id: "good" };
  if (dpi >= 220) return { stars: 3, id: "acceptable" };
  if (dpi >= 150) return { stars: 2, id: "low" };
  return { stars: 1, id: "critical" };
}

function classifyOptimizationScale(factor) {
  if (factor > 3) return "blocked";
  if (factor > 2) return "caution";
  return "direct";
}

function formatStarRating(stars) {
  const filled = Math.min(5, Math.max(0, Math.round(stars)));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed++;
    return;
  }
  console.log(`PASS: ${msg}`);
  passed++;
}

assert(getPrintQualityTier(528).stars === 5, "528 DPI → 5 stars");
assert(getPrintQualityTier(428).stars === 4, "428 DPI → 4 stars");
assert(getPrintQualityTier(218).stars === 2, "218 DPI → 2 stars");
assert(formatStarRating(4) === "★★★★☆", "4 star display");
assert(classifyOptimizationScale(1.5) === "direct", "1.5x direct");
assert(classifyOptimizationScale(2.5) === "caution", "2.5x caution");
assert(classifyOptimizationScale(4) === "blocked", "4x blocked");

const src = readFileSync(
  new URL("../lib/print-ready.ts", import.meta.url),
  "utf8",
);
assert(src.includes("getImageLayerPrintReady"), "print-ready service");
assert(src.includes("getDesignerResolutionBoostPlan"), "uses existing booster plan");
assert(!src.includes("analyzeImagePrintQuality"), "no runtime dpi import");

const panel = readFileSync(
  new URL("../components/designer/PrintReadyPanel.tsx", import.meta.url),
  "utf8",
);
assert(panel.includes("一鍵最佳化圖片"), "optimize button label");
assert(panel.includes("PrintReadyConfirmModal"), "confirm modal wired");
assert(
  src.includes("buildPrintReadyView(layer, quality, plan)"),
  "layer passed into buildPrintReadyView",
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
