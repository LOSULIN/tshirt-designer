/**
 * Designer Geometry V2 — overlay debug CLI (audit only).
 * Run: npx tsx lib/designer-geometry-v2/geometry-overlay-debug.ts
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { buildGeometryProfileV2 } from "./geometry-builder";
import { buildGeometryV2AssetRelativePath } from "./constants";
import {
  GEOMETRY_OVERLAY_COLOR_PAIRS,
  GEOMETRY_OVERLAY_OUTPUT_DIR,
  buildTemplateAssetRelativePath,
} from "./geometry-overlay-constants";
import {
  compareGeometryOverlayV1V2,
  formatGeometryOverlayDeltaReport,
  resolveGeometryV1OverlayRects,
  resolveGeometryV2OverlayRects,
} from "./geometry-overlay";
import {
  buildGeometryOverlayOutputPath,
  renderGeometryOverlayPng,
  writeGeometryOverlaySummary,
} from "./geometry-overlay-render";
import { assertGeometryV2Canvas } from "./measure-garment-alpha";

const ROOT = process.cwd();
const SIDES = ["front", "back"] as const;

async function loadRaw(assetPath: string) {
  const absolutePath = join(ROOT, assetPath);
  const { data, info } = await sharp(absolutePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assertGeometryV2Canvas(info.width, info.height);
  return { data, width: info.width, height: info.height };
}

function formatWhiteReport(
  side: "front" | "back",
  comparison: ReturnType<typeof compareGeometryOverlayV1V2>,
): string {
  const { v1, v2, delta } = comparison;
  return [
    `=== White ${side.charAt(0).toUpperCase() + side.slice(1)} Overlay Report ===`,
    "",
    "Collar Delta",
    `  ${delta.collarY >= 0 ? "+" : ""}${delta.collarY} px`,
    "",
    "Factory Origin Delta",
    `  Δx ${delta.factoryOriginX}px  Δy ${delta.factoryOriginY >= 0 ? "+" : ""}${delta.factoryOriginY} px`,
    "",
    "Artwork Stage Delta",
    `  top ${delta.artworkStageTop >= 0 ? "+" : ""}${delta.artworkStageTop} px  left ${delta.artworkStageLeft >= 0 ? "+" : ""}${delta.artworkStageLeft} px`,
    "",
    "Safe Area Delta",
    `  top ${delta.safeAreaTop >= 0 ? "+" : ""}${delta.safeAreaTop} px  left ${delta.safeAreaLeft >= 0 ? "+" : ""}${delta.safeAreaLeft} px`,
    "",
    "V1 (red)",
    `  Collar Anchor: (${v1.collarPoint.x}, ${v1.collarPoint.y})`,
    `  Factory Origin: (${v1.factoryOrigin.x}, ${v1.factoryOrigin.y})`,
    `  Artwork Stage: top=${v1.artworkStage.top.toFixed(2)} left=${v1.artworkStage.left.toFixed(2)}`,
    `  Safe Area: top=${v1.safeArea.top.toFixed(2)} left=${v1.safeArea.left.toFixed(2)}`,
  "",
    "V2 (blue)",
    `  Collar Bottom: (${v2.collarPoint.x}, ${v2.collarPoint.y})`,
    `  Factory Origin: (${v2.factoryOrigin.x}, ${v2.factoryOrigin.y})`,
    `  Artwork Stage: top=${v2.artworkStage.top.toFixed(2)} left=${v2.artworkStage.left.toFixed(2)}`,
    `  Safe Area: top=${v2.safeArea.top.toFixed(2)} left=${v2.safeArea.left.toFixed(2)}`,
    "",
    "Visual audit note",
    `  V2 collar bottom vs alpha bbox top: ${v2.collarPoint.y - v2.alphaBoundingBox.top}px below alpha top`,
    "  Inspect overlay PNG — if V2 collar (blue) deviates from visible collar hem, report only (no algorithm fix in this phase).",
  ].join("\n");
}

async function run(): Promise<void> {
  const deltaReports: string[] = [];
  const whiteReports: { front?: string; back?: string } = {};
  const summaryRows: string[] = [];

  console.log("=== Phase 69.2.1 Geometry Overlay Debug Viewer ===\n");

  for (const { uaSlug, templateSlug } of GEOMETRY_OVERLAY_COLOR_PAIRS) {
    for (const side of SIDES) {
      const uaPath = join(ROOT, buildGeometryV2AssetRelativePath(uaSlug, side));
      const templatePath = join(
        ROOT,
        buildTemplateAssetRelativePath(templateSlug, side),
      );

      if (!existsSync(uaPath)) {
        throw new Error(`Missing UA asset: ${uaPath}`);
      }
      if (!existsSync(templatePath)) {
        throw new Error(`Missing template asset: ${templatePath}`);
      }

      const buffer = await loadRaw(buildGeometryV2AssetRelativePath(uaSlug, side));
      const profile = buildGeometryProfileV2({
        side,
        colorSlug: uaSlug,
        sourceAsset: buildGeometryV2AssetRelativePath(uaSlug, side),
        buffer,
      });

      const comparison = compareGeometryOverlayV1V2(side, uaSlug, profile);
      const report = formatGeometryOverlayDeltaReport(comparison);
      deltaReports.push(report);

      if (uaSlug === "white") {
        whiteReports[side] = formatWhiteReport(side, comparison);
      }

      summaryRows.push(
        `${uaSlug}/${side}: collar Δ${comparison.delta.collarY}px, origin Δy${comparison.delta.factoryOriginY}px, stage Δ${comparison.delta.artworkStageTop}px, safe Δ${comparison.delta.safeAreaTop}px`,
      );

      const outputPath = join(
        ROOT,
        buildGeometryOverlayOutputPath(uaSlug, side),
      );
      await renderGeometryOverlayPng({
        templatePath,
        uaPath,
        side,
        colorSlug: uaSlug,
        v1: resolveGeometryV1OverlayRects(side),
        v2: resolveGeometryV2OverlayRects(profile),
        outputPath,
      });
    }
  }

  await writeGeometryOverlaySummary(
    [
      "Geometry Overlay Delta Summary",
      "==============================",
      ...summaryRows,
      "",
      ...deltaReports,
    ],
    join(ROOT, GEOMETRY_OVERLAY_OUTPUT_DIR, "summary.txt"),
  );

  if (whiteReports.front) {
    await writeGeometryOverlaySummary(
      [whiteReports.front],
      join(ROOT, GEOMETRY_OVERLAY_OUTPUT_DIR, "white-front-report.txt"),
    );
  }
  if (whiteReports.back) {
    await writeGeometryOverlaySummary(
      [whiteReports.back],
      join(ROOT, GEOMETRY_OVERLAY_OUTPUT_DIR, "white-back-report.txt"),
    );
  }

  console.log(`Generated ${GEOMETRY_OVERLAY_COLOR_PAIRS.length * SIDES.length} overlay PNGs → ${GEOMETRY_OVERLAY_OUTPUT_DIR}/`);
  console.log("\n--- White Front Report ---\n");
  console.log(whiteReports.front);
  console.log("\n--- White Back Report ---\n");
  console.log(whiteReports.back);
  console.log("\n--- Geometry Delta Summary ---\n");
  for (const row of summaryRows) console.log(row);
  console.log("\nDONE");
}

run().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
