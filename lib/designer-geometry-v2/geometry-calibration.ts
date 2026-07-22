/**
 * Designer Geometry V2 — QA calibration analysis (Phase 69.5).
 *
 * Uses Builder, Overlay, Shadow Render, Heatmap, Pixel Diff to tune
 * Product Master toward visual UA35001 alignment.
 */

import { join } from "node:path";
import sharp from "sharp";
import type { Side } from "@/lib/constants";
import { GEOMETRY_V2_COLOR_SLUGS, buildGeometryV2AssetRelativePath } from "./constants";
import { buildGeometryProfileV2 } from "./geometry-builder";
import {
  GEOMETRY_CALIBRATION_GOAL_NOTE,
  GEOMETRY_CALIBRATION_OUTPUT_DIR,
  GEOMETRY_V2_CALIBRATION_BASELINE,
  GEOMETRY_V2_COLLAR_BOTTOM_Y_OFFSET_PX,
  GEOMETRY_V2_COLLAR_SHOULDER_BLEND_RATIO,
  GEOMETRY_V2_COLLAR_SHOULDER_EXPAND_RATIO,
  GEOMETRY_V2_PRODUCT_MASTER_USE_MEDIAN_COLLAR,
  getBaselineCollarDerivationCalibration,
  getActiveCollarDerivationCalibration,
} from "./geometry-builder-calibration";
import { formatGeometryCalibrationReport } from "./geometry-calibration-report";
import type {
  GeometryCalibrationAssetResult,
  GeometryCalibrationPhaseMetrics,
  GeometryCalibrationReport,
} from "./geometry-calibration-types";
import { assertGeometryV2Canvas } from "./measure-garment-alpha";
import { buildProductMasterGeometry } from "./product-master-geometry";
import type { ProductMasterGeometry } from "./product-master-profile";
import type { GeometryProfileV2 } from "./geometry-profile";
import {
  compareShadowRenderGeometry,
  computeShadowPixelDifferenceAsync,
  renderShadowGeometryFrame,
  renderShadowPixelHeatmap,
  buildShadowRenderGeometryContext,
  resolveShadowLayerPlacements,
} from "./shadow-render";
import {
  buildTemplateAssetRelativePath,
  resolveTemplateSlugForUa,
} from "./geometry-overlay-constants";
import { resolveProductMasterRuntimeSnapshot } from "./shadow-runtime";
import { computeGeometryMetricStats } from "./product-master-geometry";
import type { ShadowPixelDifferenceReport } from "./shadow-render-types";

const SIDES = ["front", "back"] as const;
const TORSO_REGION = { top: 200, bottom: 950 };

async function loadRaw(assetPath: string) {
  const absolutePath = join(process.cwd(), assetPath);
  const { data, info } = await sharp(absolutePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assertGeometryV2Canvas(info.width, info.height);
  return { data, width: info.width, height: info.height };
}

async function loadProfiles(
  calibration = getBaselineCollarDerivationCalibration(),
): Promise<GeometryProfileV2[]> {
  const profiles: GeometryProfileV2[] = [];
  for (const colorSlug of GEOMETRY_V2_COLOR_SLUGS) {
    for (const side of SIDES) {
      const assetPath = buildGeometryV2AssetRelativePath(colorSlug, side);
      const buffer = await loadRaw(assetPath);
      profiles.push(
        buildGeometryProfileV2(
          { side, colorSlug, sourceAsset: assetPath, buffer },
          calibration,
        ),
      );
    }
  }
  return profiles;
}

function resolveHemY(profile: GeometryProfileV2): number {
  return profile.garmentBounds.top + profile.garmentBounds.height - 1;
}

async function analyzeTorsoPixelDiff(
  v1Png: Buffer,
  v2Png: Buffer,
  threshold = 8,
): Promise<number> {
  const v1 = await sharp(v1Png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const v2 = await sharp(v2Png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: d1, info } = v1;
  const { data: d2 } = v2;
  const { width } = info;

  let torsoPixels = 0;
  let differing = 0;

  for (let y = TORSO_REGION.top; y < TORSO_REGION.bottom; y++) {
    for (let x = 0; x < width; x++) {
      torsoPixels++;
      const i = (y * width + x) * 4;
      const delta = Math.max(
        Math.abs(d1[i] - d2[i]),
        Math.abs(d1[i + 1] - d2[i + 1]),
        Math.abs(d1[i + 2] - d2[i + 2]),
        Math.abs(d1[i + 3] - d2[i + 3]),
      );
      if (delta > threshold) differing++;
    }
  }

  return torsoPixels > 0 ? (differing / torsoPixels) * 100 : 0;
}

async function runAssetShadowMetrics(
  colorSlug: string,
  side: Side,
  master: ProductMasterGeometry,
  outputDir: string,
): Promise<{
  pixelDiff: ShadowPixelDifferenceReport;
  torsoPixelDiffPercent: number;
}> {
  const templateSlug = resolveTemplateSlugForUa(colorSlug);
  const templatePath = join(
    process.cwd(),
    buildTemplateAssetRelativePath(templateSlug, side),
  );
  const uaPath = join(
    process.cwd(),
    buildGeometryV2AssetRelativePath(colorSlug, side),
  );

  const v1Ctx = buildShadowRenderGeometryContext("v1", side);
  const v2Snapshot = resolveProductMasterRuntimeSnapshot(side, master);
  const v2Ctx = {
    version: "v2" as const,
    side,
    snapshot: v2Snapshot,
    placements: resolveShadowLayerPlacements(v2Snapshot),
  };

  const v1Path = join(outputDir, `${colorSlug}-${side}-v1.png`);
  const v2Path = join(outputDir, `${colorSlug}-${side}-v2.png`);

  await renderShadowGeometryFrame(v1Ctx, templatePath, uaPath, v1Path);
  await renderShadowGeometryFrame(v2Ctx, templatePath, uaPath, v2Path);

  const v1Png = await sharp(v1Path).png().toBuffer();
  const v2Png = await sharp(v2Path).png().toBuffer();
  const pixelDiff = await computeShadowPixelDifferenceAsync(v1Png, v2Png);
  const torsoPixelDiffPercent = await analyzeTorsoPixelDiff(v1Png, v2Png);

  if (colorSlug === "white") {
    await renderShadowPixelHeatmap(
      v1Png,
      v2Png,
      join(outputDir, `${colorSlug}-${side}-heatmap.png`),
    );
  }

  return { pixelDiff, torsoPixelDiffPercent };
}

function buildPhaseMetrics(
  profiles: GeometryProfileV2[],
  assetResults: GeometryCalibrationAssetResult[],
): GeometryCalibrationPhaseMetrics {
  const allProfiles = profiles;

  return {
    collarY: computeGeometryMetricStats(allProfiles.map((p) => p.collarBottom.y)),
    factoryOriginY: computeGeometryMetricStats(
      allProfiles.map((p) => p.factoryOrigin.y),
    ),
    artworkStageTop: computeGeometryMetricStats(
      allProfiles.map((p) => p.artworkStage.top),
    ),
    safeAreaTop: computeGeometryMetricStats(
      allProfiles.map((p) => p.safeArea.top),
    ),
    hemY: computeGeometryMetricStats(allProfiles.map((p) => resolveHemY(p))),
    centerY: computeGeometryMetricStats(
      allProfiles.map((p) => p.garmentCenter.y),
    ),
    shoulderWidth: computeGeometryMetricStats(
      allProfiles.map((p) => p.shoulder.widthPx),
    ),
    pixelDiffPercent: computeGeometryMetricStats(
      assetResults.map((a) => a.pixelDiffPercent),
    ),
    torsoPixelDiffPercent: computeGeometryMetricStats(
      assetResults.map((a) => a.torsoPixelDiffPercent),
    ),
    centerDiffY: computeGeometryMetricStats(
      assetResults
        .map((a) => a.centerDiffY)
        .filter((v): v is number => v !== null),
    ),
    topDiff: computeGeometryMetricStats(
      assetResults
        .map((a) => a.topDiff)
        .filter((v): v is number => v !== null),
    ),
    bottomDiff: computeGeometryMetricStats(
      assetResults
        .map((a) => a.bottomDiff)
        .filter((v): v is number => v !== null),
    ),
  };
}

function formatSideCalibrationDetail(
  side: Side,
  master: ProductMasterGeometry,
  compare: ReturnType<typeof compareShadowRenderGeometry>,
  pixelDiffPercent: number,
  torsoPct: number,
  centerDiffY: number | null,
  topDiff: number | null,
  bottomDiff: number | null,
): string {
  const m = side === "front" ? master.front : master.back;
  return [
    `Product Master collar: (${m.collarBottom.x}, ${m.collarBottom.y})`,
    `Factory origin: (${m.factoryOrigin.x}, ${m.factoryOrigin.y})`,
    `Artwork stage top: ${m.artworkStage.top}`,
    `Safe area top: ${m.safeArea.top}`,
    `Hem: (${m.hem.x}, ${m.hem.y})`,
    `Center: (${m.centerPoint.x}, ${m.centerPoint.y})`,
    `Shoulder width: ${m.shoulderWidthPx}px`,
    `Layer position ΔY (vs V1): ${compare.layers.map((l) => `${l.layerId}=${l.positionDeltaY}px`).join(", ")}`,
    `Layer scale/rotation: unchanged (same design intent)`,
    `Pixel diff: ${pixelDiffPercent.toFixed(3)}% | torso: ${torsoPct.toFixed(3)}%`,
    `Heatmap center ΔY: ${centerDiffY?.toFixed(0) ?? "n/a"} | top diff: ${topDiff ?? "n/a"}px | bottom diff: ${bottomDiff ?? "n/a"}px`,
  ].join("\n");
}

export async function runGeometryQACalibration(
  outputDir: string = GEOMETRY_CALIBRATION_OUTPUT_DIR,
): Promise<GeometryCalibrationReport> {
  const baselineProfiles = await loadProfiles(
    getBaselineCollarDerivationCalibration(),
  );
  const calibratedProfiles = await loadProfiles(
    getActiveCollarDerivationCalibration(),
  );

  const baselineMaster = buildProductMasterGeometry(baselineProfiles, {
    useMedianCollar: false,
    visualBiasPx: 0,
  });
  const calibratedMaster = buildProductMasterGeometry(calibratedProfiles);

  const collectAssetResults = async (
    master: ProductMasterGeometry,
    profiles: GeometryProfileV2[],
    subDir: string,
  ): Promise<GeometryCalibrationAssetResult[]> => {
    const results: GeometryCalibrationAssetResult[] = [];
    for (const colorSlug of GEOMETRY_V2_COLOR_SLUGS) {
      for (const side of SIDES) {
        const profile = profiles.find(
          (p) => p.colorSlug === colorSlug && p.side === side,
        )!;
        const { pixelDiff, torsoPixelDiffPercent } = await runAssetShadowMetrics(
          colorSlug,
          side,
          master,
          join(outputDir, subDir),
        );
        results.push({
          colorSlug,
          side,
          collarY: profile.collarBottom.y,
          artworkStageTop: profile.artworkStage.top,
          pixelDiffPercent: pixelDiff.diffPercent,
          torsoPixelDiffPercent,
          centerDiffY: pixelDiff.centerDifference?.y ?? null,
          topDiff: pixelDiff.topDifference,
          bottomDiff: pixelDiff.bottomDifference,
        });
      }
    }
    return results;
  };

  const beforeAssets = await collectAssetResults(
    baselineMaster,
    baselineProfiles,
    "before",
  );
  const afterAssets = await collectAssetResults(
    calibratedMaster,
    calibratedProfiles,
    "after",
  );

  const before = buildPhaseMetrics(baselineProfiles, beforeAssets);
  const after = buildPhaseMetrics(calibratedProfiles, afterAssets);

  const whiteFrontAfter = afterAssets.find(
    (a) => a.colorSlug === "white" && a.side === "front",
  )!;
  const whiteBackAfter = afterAssets.find(
    (a) => a.colorSlug === "white" && a.side === "back",
  )!;

  const whiteFrontCompare = compareShadowRenderGeometry("front", "white");
  const whiteBackCompare = compareShadowRenderGeometry("back", "white");

  const improvement = {
    collarStdDevDelta: after.collarY.stdDev - before.collarY.stdDev,
    pixelDiffPercentDelta:
      after.pixelDiffPercent.average - before.pixelDiffPercent.average,
    torsoPixelDiffPercentDelta:
      after.torsoPixelDiffPercent.average - before.torsoPixelDiffPercent.average,
    centerDiffYDelta:
      after.centerDiffY.average - before.centerDiffY.average,
  };

  const report: GeometryCalibrationReport = {
    goalNote: GEOMETRY_CALIBRATION_GOAL_NOTE,
    flow: [
      "Builder + Overlay measurement (20 assets)",
      "↓",
      "Baseline vs Calibrated Product Master",
      "↓",
      "Shadow Render + Heatmap + Pixel Diff",
      "↓",
      "Visual UA35001 alignment QA",
    ],
    builderCalibration: {
      before: {
        expandRatio: GEOMETRY_V2_CALIBRATION_BASELINE.collarShoulderExpandRatio,
        blendRatio: GEOMETRY_V2_CALIBRATION_BASELINE.collarShoulderBlendRatio,
        collarYOffsetFront:
          GEOMETRY_V2_CALIBRATION_BASELINE.collarBottomYOffsetPx.front,
        collarYOffsetBack:
          GEOMETRY_V2_CALIBRATION_BASELINE.collarBottomYOffsetPx.back,
        masterAggregation: "mean",
      },
      after: {
        expandRatio: GEOMETRY_V2_COLLAR_SHOULDER_EXPAND_RATIO,
        blendRatio: GEOMETRY_V2_COLLAR_SHOULDER_BLEND_RATIO,
        collarYOffsetFront: GEOMETRY_V2_COLLAR_BOTTOM_Y_OFFSET_PX.front,
        collarYOffsetBack: GEOMETRY_V2_COLLAR_BOTTOM_Y_OFFSET_PX.back,
        masterAggregation: GEOMETRY_V2_PRODUCT_MASTER_USE_MEDIAN_COLLAR
          ? "median + visual bias"
          : "mean",
      },
    },
    before,
    after,
    improvement,
    whiteFrontDetail: formatSideCalibrationDetail(
      "front",
      calibratedMaster,
      whiteFrontCompare,
      whiteFrontAfter.pixelDiffPercent,
      whiteFrontAfter.torsoPixelDiffPercent,
      whiteFrontAfter.centerDiffY,
      whiteFrontAfter.topDiff,
      whiteFrontAfter.bottomDiff,
    ),
    whiteBackDetail: formatSideCalibrationDetail(
      "back",
      calibratedMaster,
      whiteBackCompare,
      whiteBackAfter.pixelDiffPercent,
      whiteBackAfter.torsoPixelDiffPercent,
      whiteBackAfter.centerDiffY,
      whiteBackAfter.topDiff,
      whiteBackAfter.bottomDiff,
    ),
    assetResults: afterAssets,
    verdict:
      after.collarY.stdDev <= before.collarY.stdDev ||
      after.torsoPixelDiffPercent.average <= before.torsoPixelDiffPercent.average
        ? "PASS"
        : "WARNING",
    visualNote:
      "Inspect debug/geometry-calibration/after/white-*-heatmap.png — " +
      "collar cross and artwork stage should align with visible UA35001 collar/chest. " +
      "Do not chase V1 coordinate parity.",
  };

  return report;
}

export async function writeGeometryCalibrationReport(
  report: GeometryCalibrationReport,
  outputDir: string = GEOMETRY_CALIBRATION_OUTPUT_DIR,
): Promise<string> {
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(outputDir, { recursive: true });
  const text = formatGeometryCalibrationReport(report);
  const path = join(outputDir, "calibration-report.txt");
  await writeFile(path, text + "\n", "utf8");
  return path;
}

export { formatGeometryCalibrationReport };
