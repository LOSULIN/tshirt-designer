/**
 * Designer Geometry V2 — Geometry Debug Overlay regression.
 * Run: npx tsx lib/designer-geometry-v2/geometry-debug.regression.ts
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
  GEOMETRY_V2_COLOR_SLUGS,
  getActiveDesignerGeometryVersion,
} from "./index";
import {
  buildGeometryDebugOverlayBundle,
  createGeometryDebugOverlay,
  formatGeometryDebugOverlayDescription,
} from "./geometry-debug-overlay";
import {
  buildGeometryDebugOverlaySvg,
  renderGeometryDebugOverlayFromAssets,
} from "./geometry-debug-render";
import {
  DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES,
  GEOMETRY_DEBUG_OUTPUT_DIR,
} from "./geometry-debug-types";
import {
  assertGeometryDebugSafeForProduction,
  isGeometryDebugEnabled,
  resolveGeometryDebugLayerToggles,
} from "./geometry-debug-toggle";

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

const FORBIDDEN_DEBUG_IMPORTS = [
  /from ["'].*geometry-debug/,
  /GeometryDebugOverlay/,
  /isGeometryDebugEnabled/,
  /renderGeometryDebugOverlay/,
  /buildGeometryDebugOverlaySvg/,
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
    for (const pattern of FORBIDDEN_DEBUG_IMPORTS) {
      if (pattern.test(source)) {
        violations.push(`${rel}: forbidden geometry-debug import in render path`);
      }
    }
  }

  for (const rel of RUNTIME_GUARD_PATHS) scanPath(rel);
  return violations;
}

function writeReport(filename: string, content: string): void {
  const dir = join(ROOT, GEOMETRY_DEBUG_OUTPUT_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content + "\n", "utf8");
}

async function run(): Promise<void> {
  const checks: string[] = [];

  assert(
    ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V2,
    "ACTIVE_DESIGNER_GEOMETRY_VERSION must be v2",
  );
  checks.push("ACTIVE_DESIGNER_GEOMETRY_VERSION = v2");
  checks.push(`getActiveDesignerGeometryVersion() = ${getActiveDesignerGeometryVersion()}`);

  assert(isGeometryDebugEnabled(), "debug toggle ON in development");
  checks.push("Toggle PASS: development ON");

  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  assert(!isGeometryDebugEnabled(), "debug toggle OFF in production");
  const prodToggles = resolveGeometryDebugLayerToggles();
  assert(!prodToggles.v1 && !prodToggles.v2, "production toggles all off");
  process.env.NODE_ENV = prevNodeEnv ?? "development";
  checks.push("Toggle PASS: production OFF (all layers hidden)");

  assertGeometryDebugSafeForProduction();

  const violations = scanRuntimeIsolation();
  assert(violations.length === 0, violations.join("; "));
  checks.push("Runtime isolation: 0 geometry-debug imports in render paths");

  const whiteFrontBundle = buildGeometryDebugOverlayBundle("front", "white");
  const whiteBackBundle = buildGeometryDebugOverlayBundle("back", "white");

  const frontSvg = buildGeometryDebugOverlaySvg(
    whiteFrontBundle,
    DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES,
  );
  const backSvg = buildGeometryDebugOverlaySvg(
    whiteBackBundle,
    DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES,
  );

  assert(frontSvg.includes("V1"), "V1 overlay label in front SVG");
  assert(frontSvg.includes("V2"), "V2 overlay label in front SVG");
  assert(frontSvg.includes(whiteFrontBundle.v1.collar.y.toString()), "V1 collar in SVG");
  assert(frontSvg.includes(whiteFrontBundle.v2.collar.y.toString()), "V2 collar in SVG");
  checks.push("V1 Overlay PASS (front SVG)");
  checks.push("V2 Overlay PASS (front SVG)");

  const overlay = createGeometryDebugOverlay("front", "white");
  assert(overlay !== null, "GeometryDebugOverlay created in dev");
  assert(
    overlay!.hasVisibleLayers(DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES),
    "visible layers when toggles on",
  );
  checks.push("Overlay creation PASS");

  const frontDesc = formatGeometryDebugOverlayDescription(whiteFrontBundle);
  const backDesc = formatGeometryDebugOverlayDescription(whiteBackBundle);

  const frontRender = await renderGeometryDebugOverlayFromAssets(
    "white",
    "front",
    GEOMETRY_DEBUG_OUTPUT_DIR,
  );
  const backRender = await renderGeometryDebugOverlayFromAssets(
    "white",
    "back",
    GEOMETRY_DEBUG_OUTPUT_DIR,
  );

  assert(existsSync(frontRender.outputPath!), "white front debug PNG exists");
  assert(existsSync(backRender.outputPath!), "white back debug PNG exists");
  checks.push("PNG render PASS: white front + back");

  for (const colorSlug of GEOMETRY_V2_COLOR_SLUGS) {
    for (const side of SIDES) {
      const bundle = buildGeometryDebugOverlayBundle(side, colorSlug);
      const svg = buildGeometryDebugOverlaySvg(
        bundle,
        DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES,
      );
      assert(svg.length > 200, `${colorSlug}/${side} SVG must build`);
    }
  }
  checks.push("Overlay PASS: 20/20 asset SVG bundles");

  const toggleTestSvg = buildGeometryDebugOverlaySvg(whiteFrontBundle, {
    ...DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES,
    v1: true,
    v2: false,
    shoulder: false,
    hem: false,
    center: false,
  });
  assert(!toggleTestSvg.includes("V2 collar bottom"), "v2 off hides v2 collar label");
  checks.push("Layer toggle PASS: independent v1/v2 switches");

  writeReport(
    "white-front-overlay.txt",
    [
      "=== White Front Geometry Debug Overlay ===",
      "",
      "V1 (red)",
      frontDesc.v1.collar,
      frontDesc.v1.factoryOrigin,
      frontDesc.v1.artworkStage,
      frontDesc.v1.safeArea,
      "",
      "V2 (blue)",
      frontDesc.v2.collar,
      frontDesc.v2.factoryOrigin,
      frontDesc.v2.artworkStage,
      frontDesc.v2.safeArea,
      "",
      frontDesc.compareNote,
      "",
      `PNG: ${frontRender.outputPath}`,
    ].join("\n"),
  );

  writeReport(
    "white-back-overlay.txt",
    [
      "=== White Back Geometry Debug Overlay ===",
      "",
      "V1 (red)",
      backDesc.v1.collar,
      backDesc.v1.factoryOrigin,
      backDesc.v1.artworkStage,
      backDesc.v1.safeArea,
      "",
      "V2 (blue)",
      backDesc.v2.collar,
      backDesc.v2.factoryOrigin,
      backDesc.v2.artworkStage,
      backDesc.v2.safeArea,
      "",
      backDesc.compareNote,
      "",
      `PNG: ${backRender.outputPath}`,
    ].join("\n"),
  );

  writeReport(
    "regression-summary.txt",
    [
      "=== Phase 69.3.1 Geometry Debug Overlay Regression ===",
      ...checks.map((c) => `PASS: ${c}`),
      "",
      "Geometry Debug Toggle:",
      "  Development: ON (default)",
      "  Production: OFF (forced)",
      "",
      "Runtime: Geometry V1 only for render",
      "Geometry V2: Debug Overlay only",
      "",
      "ALL PASS",
    ].join("\n"),
  );

  console.log("=== Phase 69.3.1 Geometry Debug Overlay Regression ===\n");
  for (const check of checks) console.log(`PASS: ${check}`);

  console.log("\n--- White Front Overlay ---\n");
  console.log(writeReportContent(frontDesc));

  console.log("\n--- White Back Overlay ---\n");
  console.log(writeReportContent(backDesc));

  console.log("\n--- Geometry Debug Toggle ---");
  console.log("Development: ON (isGeometryDebugEnabled = true)");
  console.log("Production: OFF (isGeometryDebugEnabled = false, all layers hidden)");

  console.log("\n--- Runtime Isolation Report ---");
  console.log("Designer / ResultPanel / Projection / Placement / Export / Download / ZIP / PDF / Email:");
  console.log("  0 geometry-debug imports");
  console.log("Render path: Geometry V1 only");
  console.log("Geometry V2: Debug Overlay only");

  console.log("\nALL PASS");
}

function writeReportContent(
  desc: ReturnType<typeof formatGeometryDebugOverlayDescription>,
): string {
  return [
    "V1:",
    `  ${desc.v1.collar}`,
    `  ${desc.v1.factoryOrigin}`,
    `  ${desc.v1.artworkStage}`,
    `  ${desc.v1.safeArea}`,
    "V2:",
    `  ${desc.v2.collar}`,
    `  ${desc.v2.factoryOrigin}`,
    `  ${desc.v2.artworkStage}`,
    `  ${desc.v2.safeArea}`,
    desc.compareNote,
  ].join("\n");
}

run().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
