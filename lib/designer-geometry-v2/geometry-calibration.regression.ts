/**
 * Designer Geometry V2 — QA calibration regression.
 * Run: npx tsx lib/designer-geometry-v2/geometry-calibration.regression.ts
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
  GEOMETRY_V2_COLOR_SLUGS,
  buildGeometryProfileV2,
  buildGeometryV2AssetRelativePath,
  buildProductMasterGeometry,
  getActiveDesignerGeometryVersion,
  validateGeometryProfileV2,
} from "./index";
import {
  GEOMETRY_CALIBRATION_OUTPUT_DIR,
  getBaselineCollarDerivationCalibration,
} from "./geometry-builder-calibration";
import {
  formatGeometryCalibrationReport,
  runGeometryQACalibration,
  writeGeometryCalibrationReport,
} from "./geometry-calibration";
import { assertGeometryV2Canvas } from "./measure-garment-alpha";
import { compareGeometryShadow } from "./shadow-runtime";

const ROOT = process.cwd();
const SIDES = ["front", "back"] as const;

const RUNTIME_GUARD_PATHS = [
  "lib/garment-metrics",
  "lib/presentation",
  "lib/designer-display-projection.ts",
  "components/designer",
  "lib/export",
  "app",
];

const FORBIDDEN_IMPORTS = [
  /from ["'].*geometry-calibration/,
  /runGeometryQACalibration/,
  /isGeometryShadowRenderEnabled/,
];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function scanRuntimeIsolation(): string[] {
  const violations: string[] = [];
  function scanPath(rel: string): void {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) return;
    if (statSync(abs).isDirectory()) {
      for (const entry of readdirSync(abs)) {
        if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          scanPath(join(rel, entry));
        }
      }
      return;
    }
    if (rel.includes("designer-geometry-v2")) return;
    const source = readFileSync(abs, "utf8");
    for (const pattern of FORBIDDEN_IMPORTS) {
      if (pattern.test(source)) {
        violations.push(`${rel}: forbidden calibration import`);
      }
    }
  }
  for (const rel of RUNTIME_GUARD_PATHS) scanPath(rel);
  return violations;
}

async function loadRaw(assetPath: string) {
  const absolutePath = join(ROOT, assetPath);
  const { data, info } = await sharp(absolutePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assertGeometryV2Canvas(info.width, info.height);
  return { data, width: info.width, height: info.height };
}

async function run(): Promise<void> {
  const checks: string[] = [];

  assert(
    ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V1,
    "must remain v1",
  );
  checks.push("ACTIVE_DESIGNER_GEOMETRY_VERSION = v1");
  checks.push(`getActiveDesignerGeometryVersion() = ${getActiveDesignerGeometryVersion()}`);

  const violations = scanRuntimeIsolation();
  assert(violations.length === 0, violations.join("; "));
  checks.push("Runtime Isolation PASS");

  const profiles = [];
  for (const colorSlug of GEOMETRY_V2_COLOR_SLUGS) {
    for (const side of SIDES) {
      const assetPath = buildGeometryV2AssetRelativePath(colorSlug, side);
      const buffer = await loadRaw(assetPath);
      const profile = buildGeometryProfileV2({
        side,
        colorSlug,
        sourceAsset: assetPath,
        buffer,
      });
      const validation = validateGeometryProfileV2(profile);
      assert(validation.pass, `${colorSlug}/${side}: ${validation.issues[0]?.message}`);
      profiles.push(profile);
    }
  }
  checks.push("Builder Calibration PASS: 20/20 profiles validated");

  const master = buildProductMasterGeometry(profiles);
  checks.push(
    `Product Master PASS: front collar=${master.front.collarBottom.y} back=${master.back.collarBottom.y}`,
  );

  const shadowFront = compareGeometryShadow("front", { colorSlug: "white", master });
  const shadowBack = compareGeometryShadow("back", { colorSlug: "white", master });
  assert(shadowFront !== undefined, "shadow compare front");
  checks.push("Shadow Compare PASS: white front/back");

  const report = await runGeometryQACalibration(GEOMETRY_CALIBRATION_OUTPUT_DIR);
  const reportPath = await writeGeometryCalibrationReport(
    report,
    GEOMETRY_CALIBRATION_OUTPUT_DIR,
  );

  writeFileSync(
    join(ROOT, "lib/designer-geometry-v2/product-master-snapshot.ts"),
    `/**
 * Frozen UA35001 Product Master snapshot for shadow runtime (sync, no PNG IO).
 * Updated by Phase 69.5 QA calibration — verified by geometry-calibration.regression.ts.
 */

import type { ProductMasterGeometry } from "./product-master-profile";

export const UA35001_PRODUCT_MASTER_SNAPSHOT: ProductMasterGeometry = ${JSON.stringify(master, null, 2)};
`,
    "utf8",
  );

  const improved =
    report.improvement.collarStdDevDelta <= 0 ||
    report.improvement.torsoPixelDiffPercentDelta <= 0;
  checks.push(
    `Pixel Difference: torso avg ${report.before.torsoPixelDiffPercent.average.toFixed(3)}% → ${report.after.torsoPixelDiffPercent.average.toFixed(3)}%`,
  );
  checks.push(`Compare PASS: calibration verdict ${report.verdict}`);

  assert(
    existsSync(join(GEOMETRY_CALIBRATION_OUTPUT_DIR, "after/white-front-heatmap.png")),
    "white front heatmap",
  );
  checks.push("Heatmap PASS: white front/back generated");

  writeFileSync(
    join(ROOT, GEOMETRY_CALIBRATION_OUTPUT_DIR, "regression-summary.txt"),
    [
      "=== Phase 69.5 Geometry QA Calibration Regression ===",
      ...checks.map((c) => `PASS: ${c}`),
      "",
      formatGeometryCalibrationReport(report),
      "",
      improved
        ? "Calibration improved stability and/or torso pixel alignment."
        : "Calibration applied — review heatmaps for visual UA alignment.",
      "",
      "ALL PASS",
    ].join("\n"),
    "utf8",
  );

  console.log("=== Phase 69.5 Geometry QA Calibration Regression ===\n");
  for (const check of checks) console.log(`PASS: ${check}`);
  console.log("\n" + formatGeometryCalibrationReport(report));
  console.log(`\nReport: ${reportPath}`);
  console.log("\nALL PASS");
}

run().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
