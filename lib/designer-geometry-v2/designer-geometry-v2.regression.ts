/**
 * Designer Geometry V2 foundation regression.
 * Run: npx tsx lib/designer-geometry-v2/designer-geometry-v2.regression.ts
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
  GEOMETRY_V2_CANVAS_HEIGHT_PX,
  GEOMETRY_V2_CANVAS_WIDTH_PX,
  GEOMETRY_V2_COLOR_SLUGS,
  buildGeometryV2AssetRelativePath,
  compareGeometryV1V2Baseline,
  formatGeometryV1V2Report,
  getActiveDesignerGeometryVersion,
  isDesignerGeometryV2EnabledByDefault,
  measureDesignerGeometryV2FromAsset,
} from "./index";

const ROOT = process.cwd();
const SIDES = ["front", "back"] as const;

const RUNTIME_GUARD_PATHS = [
  "lib/garment-metrics",
  "lib/presentation/product-photo-bridge.ts",
  "lib/designer-display-projection.ts",
  "lib/designer-workspace.ts",
  "lib/coordinates/preview.ts",
  "components/designer/ResultPanelProductPreviewDesigner.tsx",
  "components/designer/PreviewGarmentView.tsx",
  "lib/export/product-export.ts",
  "lib/render/product-mockup-compose.ts",
];

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function scanRuntimeIsolation(): string[] {
  const violations: string[] = [];

  function scanPath(rel: string): void {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) return;
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(abs)) {
        if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          scanPath(join(rel, entry));
        }
      }
      return;
    }
    const source = readFileSync(abs, "utf8");
    if (/designer-geometry-v2/.test(source)) {
      violations.push(`${rel}: imports designer-geometry-v2`);
    }
  }

  for (const rel of RUNTIME_GUARD_PATHS) {
    scanPath(rel);
  }
  return violations;
}

async function runRegression(): Promise<{
  pass: boolean;
  checks: string[];
  measurements: Awaited<ReturnType<typeof measureDesignerGeometryV2FromAsset>>[];
  v1v2Reports: string[];
}> {
  const checks: string[] = [];
  const measurements = [];
  const v1v2Reports: string[] = [];

  assert(
    ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V1,
    "default geometry version must be v1",
  );
  checks.push("default geometry version = v1");

  assert(
    getActiveDesignerGeometryVersion() === DESIGNER_GEOMETRY_VERSION.V1,
    "getActiveDesignerGeometryVersion must return v1 without env",
  );
  checks.push("runtime resolver returns v1 (no env)");

  assert(
    !isDesignerGeometryV2EnabledByDefault(),
    "V2 must not be enabled by default",
  );
  checks.push("V2 not enabled by default");

  const violations = scanRuntimeIsolation();
  assert(violations.length === 0, violations.join("; "));
  checks.push(`runtime isolation: ${RUNTIME_GUARD_PATHS.length} paths scanned, 0 V2 imports`);

  for (const colorSlug of GEOMETRY_V2_COLOR_SLUGS) {
    for (const side of SIDES) {
      const assetPath = buildGeometryV2AssetRelativePath(colorSlug, side);
      assert(existsSync(join(ROOT, assetPath)), `missing asset ${assetPath}`);
      const profile = await measureDesignerGeometryV2FromAsset(
        assetPath,
        side,
        colorSlug,
      );
      measurements.push(profile);

      assert(
        profile.canvas.width === GEOMETRY_V2_CANVAS_WIDTH_PX &&
          profile.canvas.height === GEOMETRY_V2_CANVAS_HEIGHT_PX,
        `${colorSlug}/${side}: canvas size`,
      );
      assert(profile.garmentWidthPx > 0, `${colorSlug}/${side}: garment width`);
      assert(profile.garmentHeightPx > 0, `${colorSlug}/${side}: garment height`);
      assert(profile.collarAnchor.y >= 0, `${colorSlug}/${side}: collar anchor`);
      assert(profile.shoulderWidthPx > 0, `${colorSlug}/${side}: shoulder width`);
      assert(
        profile.printAreaRects.artworkStage.width > 0,
        `${colorSlug}/${side}: artwork stage`,
      );
    }
  }
  checks.push(`measured ${measurements.length} UA35001 assets (10 colors × 2 sides)`);

  const whiteFront = measurements.find(
    (m) => m.colorSlug === "white" && m.side === "front",
  )!;
  const whiteBack = measurements.find(
    (m) => m.colorSlug === "white" && m.side === "back",
  )!;

  const frontDiffs = compareGeometryV1V2Baseline("front", whiteFront);
  const backDiffs = compareGeometryV1V2Baseline("back", whiteBack);
  v1v2Reports.push(formatGeometryV1V2Report("front", frontDiffs));
  v1v2Reports.push(formatGeometryV1V2Report("back", backDiffs));
  checks.push("V1 vs V2 baseline diff computed (white)");

  assert(
    Math.abs(whiteFront.collarAnchor.y - 260) < 2,
    `white front collar Y expected ~260, got ${whiteFront.collarAnchor.y}`,
  );
  checks.push(`white/front collar anchor Y = ${whiteFront.collarAnchor.y}px (UA measured)`);

  return { pass: true, checks, measurements, v1v2Reports };
}

console.log("=== Phase 69.1 Designer Geometry V2 Foundation Regression ===\n");

runRegression()
  .then(({ checks, measurements, v1v2Reports }) => {
    for (const check of checks) console.log(`PASS: ${check}`);
    console.log("\n--- V1 vs V2 (white baseline) ---\n");
    for (const report of v1v2Reports) console.log(report + "\n");
    console.log("--- V2 white front summary ---");
    const wf = measurements.find((m) => m.colorSlug === "white" && m.side === "front")!;
    console.log(JSON.stringify({
      alphaBoundingBox: wf.alphaBoundingBox,
      collarAnchor: wf.collarAnchor,
      shoulderWidthPx: wf.shoulderWidthPx,
      garmentWidthPx: wf.garmentWidthPx,
      garmentHeightPx: wf.garmentHeightPx,
      centerPoint: wf.centerPoint,
      hem: wf.hem,
      pxPerCm: +wf.pxPerCm.toFixed(4),
      silhouettePxPerCm: +wf.silhouettePxPerCm.toFixed(4),
      artworkStage: wf.printAreaRects.artworkStage,
    }, null, 2));
    console.log("\nALL PASS");
    process.exit(0);
  })
  .catch((error) => {
    console.error("FAIL:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
