/**
 * Mockup Garment Visual Tuning regression — M identity + per-size factors.
 * Run: npx tsx lib/render/mockup-garment-visual-tuning.regression.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  applyMockupGarmentVisualTuning,
  resolveMockupGarmentVisualTuning,
} from "./mockup-garment-visual-tuning";

const ROOT = process.cwd();
const SIZES = [
  "90",
  "110",
  "130",
  "150",
  "160",
  "GS",
  "GM",
  "GL",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
] as const;

const SAMPLE_FRAME = { x: 100, y: 0, width: 824, height: 1536 };

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function runRegression(): { pass: boolean; checks: string[] } {
  const checks: string[] = [];

  const mTuning = resolveMockupGarmentVisualTuning("M");
  assert(mTuning.factorW === 1 && mTuning.factorH === 1, "M tuning = identity");
  checks.push("M factorW=1 factorH=1");

  const mFrame = applyMockupGarmentVisualTuning(
    { x: 0, y: 0, width: 1024, height: 1536 },
    "M",
  );
  assert(
    mFrame.x === 0 &&
      mFrame.y === 0 &&
      mFrame.width === 1024 &&
      mFrame.height === 1536,
    "M garment frame unchanged after tuning",
  );
  checks.push("M garment frame identity");

  const s90 = applyMockupGarmentVisualTuning(SAMPLE_FRAME, "90");
  assert(s90.height < SAMPLE_FRAME.height, "90 height shortened");
  assert(s90.width === SAMPLE_FRAME.width, "90 width unchanged");
  checks.push("90 garment height shortened");

  const xxxl = applyMockupGarmentVisualTuning(SAMPLE_FRAME, "XXXL");
  assert(xxxl.width > SAMPLE_FRAME.width, "XXXL width widened");
  assert(xxxl.height === SAMPLE_FRAME.height, "XXXL height unchanged");
  checks.push("XXXL garment width widened");

  for (const size of SIZES) {
    const tuning = resolveMockupGarmentVisualTuning(size);
    assert(
      tuning.factorW > 0 && tuning.factorH > 0,
      `${size}: positive factors`,
    );
  }
  checks.push("14 sizes: positive tuning factors");

  const composeSource = readFileSync(
    join(ROOT, "lib/render/product-mockup-compose.ts"),
    "utf8",
  );
  assert(
    composeSource.includes("applyMockupGarmentVisualTuning"),
    "compose applies garment visual tuning before draw",
  );
  assert(
    !composeSource.includes("applyMockupGarmentVisualTuning(plan.artworkFrame"),
    "tuning not applied to artwork",
  );
  checks.push("compose wiring: garment only, before drawImage");

  return { pass: true, checks };
}

const result = runRegression();
console.log(
  "Mockup Garment Visual Tuning regression:",
  result.pass ? "PASS" : "FAIL",
);
for (const check of result.checks) {
  console.log(`  ✓ ${check}`);
}
if (!result.pass) process.exit(1);
