/**
 * Phase 52 / 53 — Garment Silhouette Presentation regression.
 * Run: npx tsx lib/presentation/physical-garment-presentation.regression.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  PRESENTATION_BASELINE_SIZE,
  resolveGarmentSilhouetteProfile,
} from "./physical-garment-presentation";

const ROOT = process.cwd();

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function approxEqual(a: number, b: number, epsilon = 0.0001): boolean {
  return Math.abs(a - b) < epsilon;
}

function runRegression(): { pass: boolean; checks: string[] } {
  const checks: string[] = [];

  const m = resolveGarmentSilhouetteProfile("M");
  assert(approxEqual(m.garmentHeight, 1), "M garmentHeight = 1");
  assert(approxEqual(m.garmentWidth, 1), "M garmentWidth = 1");
  checks.push("M baseline silhouette");

  const s90 = resolveGarmentSilhouetteProfile("90");
  const s130 = resolveGarmentSilhouetteProfile("130");
  const xl = resolveGarmentSilhouetteProfile("XL");
  const xxxl = resolveGarmentSilhouetteProfile("XXXL");

  assert(s90.garmentHeight < s130.garmentHeight, "90 shorter than 130");
  assert(s130.garmentHeight < m.garmentHeight, "130 shorter than M");
  assert(m.garmentHeight < xl.garmentHeight, "M shorter than XL");
  assert(xl.garmentHeight < xxxl.garmentHeight, "XL shorter than XXXL");
  checks.push("garment height monotonic across sizes");

  assert(s90.frameMaxHeightVh < m.frameMaxHeightVh, "90 frame shorter than M");
  assert(xxxl.frameMaxHeightVh > m.frameMaxHeightVh, "XXXL frame taller than M");
  checks.push("frame height follows silhouette");

  assert(s90.garmentWidth < m.garmentWidth, "90 narrower than M");
  assert(xxxl.garmentWidth > m.garmentWidth, "XXXL wider than M");
  checks.push("garment width follows size chart");

  const gs = resolveGarmentSilhouetteProfile("GS");
  const gm = resolveGarmentSilhouetteProfile("GM");
  const gl = resolveGarmentSilhouetteProfile("GL");
  assert(gs.garmentHeight < gm.garmentHeight, "GS shorter than GM");
  assert(gm.garmentHeight < gl.garmentHeight, "GM shorter than GL");
  assert(gl.garmentHeight <= m.garmentHeight, "GL at or below M height");
  checks.push("GS / GM / GL auto silhouette");

  for (const file of [
    "lib/presentation/physical-garment-presentation.ts",
    "lib/presentation/product-preview-camera.ts",
    "components/designer/ProductPreviewPresentation.tsx",
  ]) {
    const source = readFileSync(join(ROOT, file), "utf8");
    assert(!source.includes("SIZE_CAMERA_OVERRIDES"), `${file}: no override table`);
    assert(!/if\s*\(\s*size\s*===/.test(source), `${file}: no size branch`);
    assert(
      !/transform:\s*[`'"].*scale/.test(source),
      `${file}: no CSS transform scale`,
    );
  }
  checks.push("no camera overrides / no transform scale");

  assert(
    readFileSync(
      join(ROOT, "lib/presentation/product-preview-camera.ts"),
      "utf8",
    ).includes('objectFit: "cover"'),
    "viewport uses object-fit cover for silhouette crop",
  );
  checks.push("garment viewport crop via object-cover");

  assert(PRESENTATION_BASELINE_SIZE === "M", "baseline is M");
  checks.push("baseline M");

  return { pass: true, checks };
}

try {
  const result = runRegression();
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.log(
    JSON.stringify(
      {
        pass: false,
        error: err instanceof Error ? err.message : String(err),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
