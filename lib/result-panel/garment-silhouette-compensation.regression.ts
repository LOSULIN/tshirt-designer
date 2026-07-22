/**
 * Garment Silhouette Compensation regression — ResultPanel isolation.
 * Run: npx tsx lib/result-panel/garment-silhouette-compensation.regression.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  isSilhouetteCompensationIdentity,
  resolveGarmentSilhouetteCompensation,
  SILHOUETTE_COMPENSATION_BASELINE_SIZE,
} from "./garment-silhouette-compensation";

const ROOT = process.cwd();

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const checks: string[] = [];

const m = resolveGarmentSilhouetteCompensation(SILHOUETTE_COMPENSATION_BASELINE_SIZE);
assert(isSilhouetteCompensationIdentity(m), "M baseline is identity");
checks.push("M baseline identity");

const s90 = resolveGarmentSilhouetteCompensation("90");
assert(s90.compensation.chest < 1, "90 chest compensation < 1");
assert(s90.compensation.length < 1, "90 length compensation < 1");
checks.push("90 smaller silhouette axes");

const xxxl = resolveGarmentSilhouetteCompensation("XXXL");
assert(xxxl.compensation.chest > 1, "XXXL chest compensation > 1");
assert(xxxl.compensation.length > 1, "XXXL length compensation > 1");
checks.push("XXXL larger silhouette axes");

const composeSource = readSource("lib/render/product-mockup-compose.ts");
assert(
  !composeSource.includes("result-panel"),
  "composeProductMockup unchanged by ResultPanel",
);
checks.push("export compose path isolated");

const resultPanelCompose = readSource(
  "lib/result-panel/compose-result-panel-mockup.ts",
);
assert(
  resultPanelCompose.includes("ctx.drawImage(asset.image, 0, 0, canvas.width, canvas.height)"),
  "garment fill canvas preserved",
);
assert(
  !resultPanelCompose.includes("width * ratio"),
  "no dest rect ratio scaling",
);
checks.push("ResultPanel compose uses fill + warp only");

const resultPanelSource = readSource("components/designer/ResultPanel.tsx");
assert(
  resultPanelSource.includes("useResultPanelProductPreview"),
  "ResultPanel uses silhouette preview hook",
);
checks.push("ResultPanel wired to silhouette preview");

console.log(
  JSON.stringify(
    {
      pass: true,
      phase: "63-garment-silhouette-compensation",
      checks,
    },
    null,
    2,
  ),
);
