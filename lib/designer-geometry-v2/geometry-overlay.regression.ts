/**
 * Designer Geometry V2 — overlay regression (audit consistency + runtime isolation).
 * Run: npx tsx lib/designer-geometry-v2/geometry-overlay.regression.ts
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
  getActiveDesignerGeometryVersion,
} from "./geometry-version";
import { buildGeometryProfileV2 } from "./geometry-builder";
import {
  GEOMETRY_V2_COLOR_SLUGS,
  buildGeometryV2AssetRelativePath,
} from "./constants";
import {
  GEOMETRY_OVERLAY_COLOR_PAIRS,
  GEOMETRY_OVERLAY_OUTPUT_DIR,
  buildTemplateAssetRelativePath,
} from "./geometry-overlay-constants";
import {
  compareGeometryOverlayV1V2,
  overlayMatchesBuilderProfile,
  resolveGeometryV2OverlayRects,
} from "./geometry-overlay";
import {
  buildGeometryOverlayOutputPath,
  renderGeometryOverlayPng,
} from "./geometry-overlay-render";
import { resolveGeometryV1OverlayRects } from "./geometry-overlay";
import { assertGeometryV2Canvas } from "./measure-garment-alpha";

const ROOT = process.cwd();
const SIDES = ["front", "back"] as const;

const RUNTIME_GUARD_PATHS = [
  "lib/garment-metrics",
  "lib/presentation",
  "lib/designer-display-projection.ts",
  "components/designer",
  "lib/export",
  "app",
  "pages",
];

const OVERLAY_FORBIDDEN_IMPORTS = [
  /from ["'].*geometry-overlay/,
  /geometry-overlay-debug/,
  /renderGeometryOverlayPng/,
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
    for (const pattern of OVERLAY_FORBIDDEN_IMPORTS) {
      if (pattern.test(source)) {
        violations.push(`${rel}: forbidden overlay import`);
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
  const assetResults: string[] = [];

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
  checks.push(`runtime isolation: 0 overlay imports outside V2 audit module`);

  let passCount = 0;

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

      const overlayV2 = resolveGeometryV2OverlayRects(profile);
      assert(
        overlayMatchesBuilderProfile(overlayV2, profile),
        `${colorSlug}/${side}: overlay V2 must match builder profile`,
      );

      const comparison = compareGeometryOverlayV1V2(side, colorSlug, profile);
      const pair = GEOMETRY_OVERLAY_COLOR_PAIRS.find(
        (p) => p.uaSlug === colorSlug,
      )!;
      const templatePath = join(
        ROOT,
        buildTemplateAssetRelativePath(pair.templateSlug, side),
      );
      const uaPath = join(ROOT, assetPath);
      const outputPath = join(
        ROOT,
        buildGeometryOverlayOutputPath(colorSlug, side),
      );

      await renderGeometryOverlayPng({
        templatePath,
        uaPath,
        side,
        colorSlug,
        v1: resolveGeometryV1OverlayRects(side),
        v2: overlayV2,
        outputPath,
      });

      assert(existsSync(outputPath), `${colorSlug}/${side}: overlay PNG missing`);
      passCount++;
      assetResults.push(
        `PASS ${colorSlug}/${side}: overlay↔builder OK, collar Δ${comparison.delta.collarY}px`,
      );
    }
  }

  checks.push(`overlay/builder consistency: ${passCount}/20 assets`);
  checks.push(`overlay PNG output: ${GEOMETRY_OVERLAY_OUTPUT_DIR}/`);

  const whiteFront = assetResults.find((r) => r.includes("white/front"));
  const whiteBack = assetResults.find((r) => r.includes("white/back"));
  assert(whiteFront !== undefined, "white front must be tested");
  assert(whiteBack !== undefined, "white back must be tested");
  checks.push("white front + white back included in 20-asset sweep");

  console.log("=== Phase 69.2.1 Geometry Overlay Regression ===\n");
  for (const check of checks) console.log(`PASS: ${check}`);
  console.log("\n--- 20 Asset Results ---");
  for (const row of assetResults) console.log(row);

  console.log("\n--- Runtime Isolation Report ---");
  console.log("Scanned: lib/garment-metrics, lib/presentation, components/designer, lib/export, app");
  console.log("Forbidden: geometry-overlay*, geometry-overlay-debug, renderGeometryOverlayPng");
  console.log("Violations: 0");

  console.log("\nALL PASS");
}

run().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
