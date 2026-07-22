/**
 * Designer Geometry V2 — Product Master regression (audit only).
 * Run: npx tsx lib/designer-geometry-v2/product-master.regression.ts
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
  GEOMETRY_V2_COLOR_SLUGS,
  buildGeometryV2AssetRelativePath,
  getActiveDesignerGeometryVersion,
} from "./index";
import { buildGeometryProfileV2 } from "./geometry-builder";
import { assertGeometryV2Canvas } from "./measure-garment-alpha";
import {
  PRODUCT_MASTER_OUTPUT_DIR,
  buildProductMasterGeometry,
  buildProductMasterStabilityReport,
  formatProductMasterGeometryReport,
  formatProductMasterStabilityReport,
} from "./product-master-geometry";
import {
  formatColorVarianceReport,
  validateMasterGeometryForProfiles,
} from "./product-master-validation";
import type { ProductMasterGeometry } from "./product-master-profile";

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
  /from ["'].*product-master/,
  /buildProductMasterGeometry/,
  /PRODUCT_MASTER_GEOMETRY/,
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
        violations.push(`${rel}: forbidden product-master import`);
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

function writeReport(filename: string, content: string): void {
  const dir = join(ROOT, PRODUCT_MASTER_OUTPUT_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content + "\n", "utf8");
}

async function run(): Promise<void> {
  const checks: string[] = [];
  const profiles = [];

  assert(
    ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V1,
    "ACTIVE_DESIGNER_GEOMETRY_VERSION must remain v1",
  );
  checks.push("ACTIVE_DESIGNER_GEOMETRY_VERSION = v1");

  assert(
    getActiveDesignerGeometryVersion() === DESIGNER_GEOMETRY_VERSION.V1,
    "getActiveDesignerGeometryVersion() must return v1",
  );
  checks.push("getActiveDesignerGeometryVersion() = v1");

  const violations = scanRuntimeIsolation();
  assert(violations.length === 0, violations.join("; "));
  checks.push("runtime isolation: 0 product-master imports outside V2 audit module");

  for (const colorSlug of GEOMETRY_V2_COLOR_SLUGS) {
    for (const side of SIDES) {
      const assetPath = buildGeometryV2AssetRelativePath(colorSlug, side);
      const buffer = await loadRaw(assetPath);
      profiles.push(
        buildGeometryProfileV2({
          side,
          colorSlug,
          sourceAsset: assetPath,
          buffer,
        }),
      );
    }
  }
  checks.push(`loaded ${profiles.length}/20 builder profiles for cross-validation`);

  const master: ProductMasterGeometry = buildProductMasterGeometry(profiles);
  checks.push("built single UA35001 Product Master Geometry (front + back)");

  const frontValidation = validateMasterGeometryForProfiles(
    master.front,
    profiles,
  );
  const backValidation = validateMasterGeometryForProfiles(master.back, profiles);
  const allValidation = [...frontValidation, ...backValidation];

  const passCount = allValidation.filter((r) => r.pass).length;
  const failCount = allValidation.length - passCount;
  checks.push(
    `master applied to 20 assets: ${passCount} PASS, ${failCount} FAIL`,
  );

  const frontStability = buildProductMasterStabilityReport(master.front, profiles);
  const backStability = buildProductMasterStabilityReport(master.back, profiles);

  const frontReport = formatProductMasterGeometryReport(master.front);
  const backReport = formatProductMasterGeometryReport(master.back);
  const frontVariance = formatColorVarianceReport(frontValidation);
  const backVariance = formatColorVarianceReport(backValidation);
  const frontStabilityReport = formatProductMasterStabilityReport(frontStability);
  const backStabilityReport = formatProductMasterStabilityReport(backStability);

  writeReport("master-front.txt", frontReport);
  writeReport("master-back.txt", backReport);
  writeReport("variance-front.txt", frontVariance);
  writeReport("variance-back.txt", backVariance);
  writeReport("stability-front.txt", frontStabilityReport);
  writeReport("stability-back.txt", backStabilityReport);
  writeReport(
    "master-geometry.json",
    JSON.stringify(master, null, 2),
  );

  const regressionSummary = [
    "=== Product Master Regression Summary ===",
    `Assets: 20 (10 colors × front/back)`,
    `Master: UA35001 single geometry (averaged factory cross-validation)`,
    "",
    "--- Front Stability ---",
    frontStabilityReport,
    "",
    "--- Back Stability ---",
    backStabilityReport,
    "",
    "--- Front Color Variance ---",
    frontVariance,
    "",
    "--- Back Color Variance ---",
    backVariance,
    "",
    `Validation: ${passCount}/${allValidation.length} PASS`,
    `Stability verdict: front=${frontStability.verdict} back=${backStability.verdict}`,
  ].join("\n");
  writeReport("regression-summary.txt", regressionSummary);

  console.log("=== Phase 69.2.2 Product Master Geometry Regression ===\n");
  for (const check of checks) console.log(`PASS: ${check}`);

  console.log("\n--- Front Master Geometry ---\n");
  console.log(frontReport);
  console.log("\n--- Back Master Geometry ---\n");
  console.log(backReport);

  console.log("\n--- 10-Color Variance (Front) ---\n");
  console.log(frontVariance);
  console.log("\n--- 10-Color Variance (Back) ---\n");
  console.log(backVariance);

  console.log("\n--- Geometry Stability ---\n");
  console.log(frontStabilityReport);
  console.log("");
  console.log(backStabilityReport);

  console.log("\n--- Runtime Isolation Report ---");
  console.log("Scanned: lib/garment-metrics, lib/presentation, components/designer, lib/export, app");
  console.log("Forbidden: product-master*, buildProductMasterGeometry");
  console.log("Violations: 0");

  if (failCount > 0) {
    console.log(`\nWARNING: ${failCount} color/side combinations failed master validation`);
    for (const result of allValidation.filter((r) => !r.pass)) {
      console.log(`  FAIL ${result.displayName}/${result.side}`);
    }
  }

  const overallVerdict =
    failCount === 0 &&
    frontStability.verdict === "PASS" &&
    backStability.verdict === "PASS"
      ? "ALL PASS"
      : failCount === 0
        ? "PASS WITH STABILITY WARNING"
        : "FAIL";

  console.log(`\n${overallVerdict}`);
  if (overallVerdict === "FAIL") process.exit(1);
}

run().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
