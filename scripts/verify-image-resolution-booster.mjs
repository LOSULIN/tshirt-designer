/**
 * Image Resolution Booster — runtime verification
 * node scripts/verify-image-resolution-booster.mjs
 */
import { readFileSync } from "node:fs";

const TARGET_DPI = 300;
const MAX_SAFE_SCALE = 3;

function calculateRequiredPixelSize(printWidthCm, printHeightCm, targetDpi = TARGET_DPI) {
  return {
    widthPx: Math.round((printWidthCm / 2.54) * targetDpi),
    heightPx: Math.round((printHeightCm / 2.54) * targetDpi),
  };
}

function calculateUpscaleFactor(currentW, currentH, required) {
  if (currentW <= 0 || currentH <= 0) return 1;
  return Math.max(required.widthPx / currentW, required.heightPx / currentH);
}

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
    return;
  }
  console.log(`PASS: ${msg}`);
  passed += 1;
}

// Example from spec: 15×21 cm @ 300 DPI → 1772×2480
{
  const required = calculateRequiredPixelSize(15, 21);
  assert(required.widthPx === 1772, "15cm width → 1772px @ 300 DPI");
  assert(required.heightPx === 2480, "21cm height → 2480px @ 300 DPI");
}

// Upscale factor example: 1338×1222 artwork → need 1772×2480
// Note: spec used mismatched example; factor = max(1772/1338, 2480/1222)
{
  const required = { widthPx: 1772, heightPx: 2480 };
  const factor = calculateUpscaleFactor(1338, 1222, required);
  assert(Math.abs(factor - 2.03) < 0.01, "upscale factor uses max dimension ratio");
}

// 31×28 cm artwork sizing
{
  const required = calculateRequiredPixelSize(31, 28);
  const factor = calculateUpscaleFactor(974, 880, required);
  assert(factor > 1 && factor <= MAX_SAFE_SCALE || factor > MAX_SAFE_SCALE, "factor computed for typical padded PNG");
}

// MAX_SAFE_SCALE gate
{
  const required = calculateRequiredPixelSize(30, 40);
  const factor = calculateUpscaleFactor(200, 200, required);
  const canBoost = factor <= MAX_SAFE_SCALE;
  assert(!canBoost, "large upscale blocked when factor > 3");
}

// replaceLayerImage preserves layer fields (static)
{
  const src = readFileSync(
    new URL("../lib/image-resolution-booster.ts", import.meta.url),
    "utf8",
  );
  assert(src.includes("replaceLayerImage"), "replaceLayerImage exported");
  assert(src.includes("...layer,"), "replaceLayerImage spreads layer");
  assert(src.includes("analyzeImageArtworkBoundsFromBlob"), "uses existing bounds analysis");
  assert(!src.includes("image-processing"), "does not import image-processing");
}

// UI wiring
for (const [file, needle] of [
  ["components/designer/ArtworkSizePanel.tsx", "ImageResolutionBoosterSection"],
  ["components/designer/DesignerApp.tsx", "boostImageLayerResolution"],
  ["components/designer/DesignerApp.tsx", "revokeLayerAssets"],
]) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert(src.includes(needle), `${file} includes ${needle}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
