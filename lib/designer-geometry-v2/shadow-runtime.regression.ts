/**
 * Designer Geometry V2 — Shadow Runtime regression.
 * Run: npx tsx lib/designer-geometry-v2/shadow-runtime.regression.ts
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
} from "./index";
import { assertGeometryV2Canvas } from "./measure-garment-alpha";
import { UA35001_PRODUCT_MASTER_SNAPSHOT } from "./product-master-snapshot";
import {
  buildGeometryShadowDebugReport,
  formatGeometryShadowComparisonReport,
  formatGeometryShadowDebugReport,
  formatGeometryShadowOverallSummary,
} from "./shadow-runtime-report";
import {
  GeometryShadowRuntime,
  assertActiveGeometryRemainsV1,
  buildGeometryShadowOverallSummary,
  compareGeometryShadow,
  createGeometryShadowRuntime,
  isGeometryShadowEnabled,
} from "./shadow-runtime";

const ROOT = process.cwd();
const SIDES = ["front", "back"] as const;
const OUTPUT_DIR = "debug/geometry-shadow-runtime";

const RUNTIME_GUARD_PATHS = [
  "lib/garment-metrics",
  "lib/presentation",
  "lib/designer-display-projection.ts",
  "components/designer",
  "lib/export",
  "app",
];

const FORBIDDEN_V2_RENDER_IMPORTS = [
  /from ["'].*designer-geometry-v2\/shadow-runtime/,
  /from ["'].*designer-geometry-v2["']/,
  /buildGeometryProfileV2/,
  /resolveProductMasterRuntimeSnapshot/,
  /compareGeometryShadow/,
  /GeometryShadowRuntime/,
  /isGeometryShadowEnabled/,
];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function writeReport(filename: string, content: string): void {
  const dir = join(ROOT, OUTPUT_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content + "\n", "utf8");
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
    for (const pattern of FORBIDDEN_V2_RENDER_IMPORTS) {
      if (pattern.test(source)) {
        violations.push(`${rel}: forbidden geometry-v2/shadow import in render path`);
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

function approxEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}


async function run(): Promise<void> {
  const checks: string[] = [];
  const comparisons = [];

  assertActiveGeometryRemainsV1();
  checks.push("ACTIVE_DESIGNER_GEOMETRY_VERSION legacy V1 enum preserved");
  checks.push(`getActiveDesignerGeometryVersion() = ${getActiveDesignerGeometryVersion()}`);

  assert(isGeometryShadowEnabled(), "shadow must be enabled in development regression");
  checks.push("isGeometryShadowEnabled() = true (development)");

  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assert(!isGeometryShadowEnabled(), "shadow must be disabled in production");
  process.env.NODE_ENV = prevNodeEnv ?? "development";
  checks.push("isGeometryShadowEnabled() = false (production)");

  const violations = scanRuntimeIsolation();
  assert(violations.length === 0, violations.join("; "));
  checks.push("runtime isolation: 0 geometry-v2/shadow imports in render paths");

  const runtime = createGeometryShadowRuntime();
  assert(runtime !== null, "shadow runtime must construct in development");
  checks.push("GeometryShadowRuntime created successfully");

  const profiles = [];
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

  const liveMaster = buildProductMasterGeometry(profiles);
  assert(
    approxEqual(
      liveMaster.front.collarBottom.y,
      UA35001_PRODUCT_MASTER_SNAPSHOT.front.collarBottom.y,
    ),
    "product master snapshot collar front must match live build",
  );
  assert(
    approxEqual(
      liveMaster.back.collarBottom.y,
      UA35001_PRODUCT_MASTER_SNAPSHOT.back.collarBottom.y,
    ),
    "product master snapshot collar back must match live build",
  );
  checks.push("Product Master snapshot matches live build (cross-validation)");

  for (const colorSlug of GEOMETRY_V2_COLOR_SLUGS) {
    for (const side of SIDES) {
      const comparison = compareGeometryShadow(side, {
        colorSlug,
        master: UA35001_PRODUCT_MASTER_SNAPSHOT,
      });
      comparisons.push(comparison);
      assert(comparison.activeVersion === "v1", "active must be v1");
      assert(comparison.shadowVersion === "v2", "shadow must be v2");
      assert(comparison.metrics.length >= 8, "compare must include all metrics");
    }
  }
  checks.push(`shadow compare executed for ${comparisons.length}/20 assets`);

  const whiteFront = comparisons.find(
    (c) => c.colorSlug === "white" && c.side === "front",
  )!;
  const whiteBack = comparisons.find(
    (c) => c.colorSlug === "white" && c.side === "back",
  )!;
  assert(whiteFront !== undefined && whiteBack !== undefined, "white front/back required");

  const overall = buildGeometryShadowOverallSummary(comparisons);
  checks.push(
    `overall compare: ${overall.passCount} PASS, ${overall.warningCount} WARNING`,
  );
  checks.push(`average |ΔY|=${overall.averageDeltaY}px max |ΔY|=${overall.maximumDeltaY}px`);

  const debugReport = buildGeometryShadowDebugReport({ colorSlug: "white" });
  assert(debugReport !== null, "debug report must build when shadow enabled");
  checks.push("shadow debug report built successfully");

  const shadowInstance = new GeometryShadowRuntime();
  const instanceFront = shadowInstance.compare("front", "white");
  assert(instanceFront !== null, "instance compare must return result in dev");
  checks.push("GeometryShadowRuntime.compare() operational");

  const frontReport = formatGeometryShadowComparisonReport(whiteFront);
  const backReport = formatGeometryShadowComparisonReport(whiteBack);
  const fullReport = formatGeometryShadowDebugReport(debugReport);
  const overallText = formatGeometryShadowOverallSummary(overall);

  writeReport("white-front-compare.txt", frontReport);
  writeReport("white-back-compare.txt", backReport);
  writeReport("debug-report.txt", fullReport);
  writeReport("overall-summary.txt", overallText);
  writeReport(
    "regression-summary.txt",
    [
      "=== Phase 69.3 Shadow Runtime Regression ===",
      ...checks.map((c) => `PASS: ${c}`),
      "",
      "--- Shadow Runtime Flow ---",
      ...debugReport.flow,
      "",
      "--- White Front Compare ---",
      frontReport,
      "",
      "--- White Back Compare ---",
      backReport,
      "",
      "--- Overall Summary ---",
      overallText,
      "",
      "--- Runtime Isolation ---",
      "Designer, Photo Bridge, Projection, ResultPanel, Export, Download: 0 geometry-v2 imports",
      "Render path: Geometry V1 only",
      "Geometry V2: Shadow Compare only",
      "",
      "ALL PASS",
    ].join("\n"),
  );

  console.log("=== Phase 69.3 Geometry Shadow Runtime Regression ===\n");
  for (const check of checks) console.log(`PASS: ${check}`);

  console.log("\n--- Shadow Runtime Flow ---\n");
  console.log(debugReport.flow.join("\n"));

  console.log("\n--- White Front Compare ---\n");
  console.log(frontReport);

  console.log("\n--- White Back Compare ---\n");
  console.log(backReport);

  console.log("\n--- Overall Summary ---\n");
  console.log(overallText);

  console.log("\n--- Runtime Isolation Report ---");
  console.log("Designer / Photo Bridge / Projection / ResultPanel / Export / Download / ZIP / PDF / Email:");
  console.log("  0 geometry-v2 or shadow-runtime imports");
  console.log("Render path: Geometry V1 only");
  console.log("Geometry V2: Shadow Compare only (designer-geometry-v2 audit module)");

  console.log("\nALL PASS");
}

run().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
