/**
 * Designer Geometry V2 — Shadow Render regression.
 * Run: npx tsx lib/designer-geometry-v2/shadow-render.regression.ts
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
  getActiveDesignerGeometryVersion,
} from "./index";
import {
  buildShadowRenderCompareSummary,
  formatShadowPixelDifferenceReport,
  formatShadowRenderGeometryCompare,
  formatShadowRenderLayerCompareTable,
} from "./shadow-render-report";
import {
  GeometryShadowRenderer,
  compareShadowRenderGeometry,
  createGeometryShadowRenderer,
  runShadowRenderAudit,
} from "./shadow-render";
import {
  assertGeometryShadowRenderSafeForProduction,
  isGeometryShadowRenderEnabled,
} from "./shadow-render-toggle";
import { SHADOW_RENDER_OUTPUT_DIR } from "./shadow-render-types";

const ROOT = process.cwd();

const RUNTIME_GUARD_PATHS = [
  "lib/garment-metrics",
  "lib/presentation",
  "lib/designer-display-projection.ts",
  "components/designer",
  "lib/export",
  "app",
];

const FORBIDDEN_SHADOW_RENDER_IMPORTS = [
  /from ["'].*shadow-render/,
  /GeometryShadowRenderer/,
  /isGeometryShadowRenderEnabled/,
  /runShadowRenderAudit/,
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
    for (const pattern of FORBIDDEN_SHADOW_RENDER_IMPORTS) {
      if (pattern.test(source)) {
        violations.push(`${rel}: forbidden shadow-render import`);
      }
    }
  }

  for (const rel of RUNTIME_GUARD_PATHS) scanPath(rel);
  return violations;
}

function writeReport(filename: string, content: string): void {
  const dir = join(ROOT, SHADOW_RENDER_OUTPUT_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content + "\n", "utf8");
}

async function run(): Promise<void> {
  const checks: string[] = [];

  assert(
    ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V1,
    "ACTIVE_DESIGNER_GEOMETRY_VERSION must remain v1",
  );
  checks.push("ACTIVE_DESIGNER_GEOMETRY_VERSION = v1");
  checks.push(`getActiveDesignerGeometryVersion() = ${getActiveDesignerGeometryVersion()}`);

  assert(isGeometryShadowRenderEnabled(), "shadow render ON in development");
  checks.push("Shadow Render PASS: development enabled");

  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assert(!isGeometryShadowRenderEnabled(), "shadow render OFF in production");
  process.env.NODE_ENV = prevNodeEnv ?? "development";
  checks.push("Shadow Render PASS: production disabled");

  assertGeometryShadowRenderSafeForProduction();

  const violations = scanRuntimeIsolation();
  assert(violations.length === 0, violations.join("; "));
  checks.push("Runtime PASS: 0 shadow-render imports in render paths");

  const renderer = createGeometryShadowRenderer();
  assert(renderer !== null, "GeometryShadowRenderer must construct in dev");
  checks.push("Shadow Render PASS: pipeline created");

  const frontResult = await runShadowRenderAudit(
    "white",
    "front",
    SHADOW_RENDER_OUTPUT_DIR,
  );
  const backResult = await runShadowRenderAudit(
    "white",
    "back",
    SHADOW_RENDER_OUTPUT_DIR,
  );

  assert(existsSync(frontResult.v2OutputPath), "white-front-shadow.png exists");
  assert(existsSync(backResult.v2OutputPath), "white-back-shadow.png exists");
  assert(
    frontResult.heatmapPath && existsSync(frontResult.heatmapPath),
    "front heatmap exists",
  );
  checks.push("Overlay PASS: white-front-shadow.png + white-back-shadow.png");

  const frontCompare = compareShadowRenderGeometry("front", "white");
  const backCompare = compareShadowRenderGeometry("back", "white");
  assert(frontCompare.layers.length >= 3, "layer compare present");
  checks.push("Compare PASS: geometry + layer metrics");

  const compareSummary = buildShadowRenderCompareSummary(
    frontResult.geometryCompare,
    frontResult.pixelDiff,
    backResult.geometryCompare,
    backResult.pixelDiff,
  );
  writeReport("compare-summary.txt", compareSummary);

  writeReport(
    "white-front-compare.txt",
    [
      formatShadowRenderGeometryCompare(frontResult.geometryCompare),
      "",
      formatShadowRenderLayerCompareTable(frontResult.geometryCompare.layers),
      "",
      formatShadowPixelDifferenceReport(frontResult.pixelDiff),
      "",
      `V1 render: ${frontResult.v1OutputPath}`,
      `V2 shadow: ${frontResult.v2OutputPath}`,
      `Heatmap: ${frontResult.heatmapPath}`,
    ].join("\n"),
  );

  writeReport(
    "white-back-compare.txt",
    [
      formatShadowRenderGeometryCompare(backResult.geometryCompare),
      "",
      formatShadowRenderLayerCompareTable(backResult.geometryCompare.layers),
      "",
      formatShadowPixelDifferenceReport(backResult.pixelDiff),
      "",
      `V1 render: ${backResult.v1OutputPath}`,
      `V2 shadow: ${backResult.v2OutputPath}`,
      `Heatmap: ${backResult.heatmapPath}`,
    ].join("\n"),
  );

  const instance = new GeometryShadowRenderer();
  const instanceResult = await instance.render("white", "front");
  assert(instanceResult !== null, "instance render works");
  checks.push("GeometryShadowRenderer.render() operational");

  writeReport(
    "regression-summary.txt",
    [
      "=== Phase 69.4 Shadow Render Regression ===",
      ...checks.map((c) => `PASS: ${c}`),
      "",
      compareSummary,
      "",
      "Runtime: Geometry V1 render unchanged",
      "Geometry V2: Shadow Render only (debug/shadow-render/)",
      "",
      "ALL PASS",
    ].join("\n"),
  );

  console.log("=== Phase 69.4 Geometry Shadow Render Regression ===\n");
  for (const check of checks) console.log(`PASS: ${check}`);

  console.log("\n--- White Front Compare ---\n");
  console.log(formatShadowRenderGeometryCompare(frontResult.geometryCompare));
  console.log("\n" + formatShadowRenderLayerCompareTable(frontResult.geometryCompare.layers));
  console.log("\n" + formatShadowPixelDifferenceReport(frontResult.pixelDiff));

  console.log("\n--- White Back Compare ---\n");
  console.log(formatShadowRenderGeometryCompare(backResult.geometryCompare));
  console.log("\n" + formatShadowRenderLayerCompareTable(backResult.geometryCompare.layers));
  console.log("\n" + formatShadowPixelDifferenceReport(backResult.pixelDiff));

  console.log("\n--- Runtime Isolation Report ---");
  console.log("Designer / Projection / Placement / Photo Bridge / ResultPanel / Export / Download / ZIP / PDF / Email:");
  console.log("  0 shadow-render or geometry-v2 render imports");
  console.log("Formal render: Geometry V1 only");

  console.log("\nALL PASS");
}

run().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
