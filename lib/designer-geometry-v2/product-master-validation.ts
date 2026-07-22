/**
 * Designer Geometry V2 — Product Master validation (audit only).
 *
 * Applies the single UA35001 master factory geometry to each color's
 * measured garment bounds and verifies stages remain inside the silhouette.
 */

import type { Side } from "@/lib/constants";
import type { GeometryProfileV2 } from "./geometry-profile";
import type {
  ProductMasterColorVariance,
  ProductMasterGeometrySide,
} from "./product-master-profile";
import {
  PRODUCT_MASTER_COLOR_DISPLAY_NAMES,
} from "./product-master-geometry";
import type { GeometryV2Rect } from "./types";

export interface ProductMasterValidationIssue {
  code: string;
  message: string;
}

export interface ProductMasterValidationResult {
  colorSlug: string;
  displayName: string;
  side: Side;
  pass: boolean;
  issues: ProductMasterValidationIssue[];
  variance: ProductMasterColorVariance;
}

function rectContains(inner: GeometryV2Rect, outer: GeometryV2Rect): boolean {
  const innerRight = inner.left + inner.width;
  const innerBottom = inner.top + inner.height;
  const outerRight = outer.left + outer.width;
  const outerBottom = outer.top + outer.height;
  return (
    inner.left >= outer.left &&
    inner.top >= outer.top &&
    innerRight <= outerRight &&
    innerBottom <= outerBottom
  );
}

function pointInsideRect(
  point: { x: number; y: number },
  rect: GeometryV2Rect,
): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

function resolveHemY(profile: GeometryProfileV2): number {
  return profile.garmentBounds.top + profile.garmentBounds.height - 1;
}

export function validateMasterGeometryForProfile(
  master: ProductMasterGeometrySide,
  profile: GeometryProfileV2,
): ProductMasterValidationResult {
  const issues: ProductMasterValidationIssue[] = [];
  const bounds = profile.garmentBounds;
  const displayName =
    PRODUCT_MASTER_COLOR_DISPLAY_NAMES[profile.colorSlug] ?? profile.colorSlug;

  if (!pointInsideRect(master.factoryOrigin, bounds)) {
    issues.push({
      code: "master_factory_origin_outside_garment",
      message: `Master factory origin (${master.factoryOrigin.x}, ${master.factoryOrigin.y}) outside ${profile.colorSlug} garment bounds`,
    });
  }

  if (!pointInsideRect(master.collarBottom, bounds)) {
    issues.push({
      code: "master_collar_outside_garment",
      message: `Master collar bottom outside ${profile.colorSlug} garment bounds`,
    });
  }

  if (!rectContains(master.artworkStage, bounds)) {
    issues.push({
      code: "master_artwork_stage_outside_garment",
      message: `Master artwork stage not fully inside ${profile.colorSlug} garment bounds`,
    });
  }

  if (!rectContains(master.safeArea, master.artworkStage)) {
    issues.push({
      code: "master_safe_area_outside_stage",
      message: `Master safe area not inside artwork stage for ${profile.colorSlug}`,
    });
  }

  const deltaCollarY = +(profile.collarBottom.y - master.collarBottom.y).toFixed(
    2,
  );
  const deltaShoulderWidth = +(
    profile.shoulder.widthPx - master.shoulderWidthPx
  ).toFixed(2);
  const deltaHemY = +(resolveHemY(profile) - master.hem.y).toFixed(2);

  const variance: ProductMasterColorVariance = {
    colorSlug: profile.colorSlug,
    displayName,
    side: profile.side,
    deltaCollarY,
    deltaShoulderWidth,
    deltaHemY,
    pass: issues.length === 0,
    issues: issues.map((i) => i.message),
  };

  return {
    colorSlug: profile.colorSlug,
    displayName,
    side: profile.side,
    pass: issues.length === 0,
    issues,
    variance,
  };
}

export function validateMasterGeometryForProfiles(
  master: ProductMasterGeometrySide,
  profiles: GeometryProfileV2[],
): ProductMasterValidationResult[] {
  return profiles
    .filter((p) => p.side === master.side)
    .map((profile) => validateMasterGeometryForProfile(master, profile));
}

export function formatColorVarianceReport(
  results: ProductMasterValidationResult[],
): string {
  const lines = ["=== Color Variance Report ==="];
  for (const result of results) {
    const status = result.pass ? "PASS" : "FAIL";
    const { deltaCollarY, deltaShoulderWidth, deltaHemY } = result.variance;
    lines.push(
      `${result.displayName} (${result.side}): Δ Collar ${deltaCollarY >= 0 ? "+" : ""}${deltaCollarY}px, Δ Shoulder ${deltaShoulderWidth >= 0 ? "+" : ""}${deltaShoulderWidth}px, Δ Hem ${deltaHemY >= 0 ? "+" : ""}${deltaHemY}px — ${status}`,
    );
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        lines.push(`  ! ${issue.code}: ${issue.message}`);
      }
    }
  }
  return lines.join("\n");
}
