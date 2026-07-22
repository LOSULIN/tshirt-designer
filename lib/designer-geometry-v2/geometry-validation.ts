/**
 * Designer Geometry V2 — geometry profile validation.
 */

import type { GeometryProfileV2 } from "./geometry-profile";
import type { GeometryV2Rect } from "./types";

export interface GeometryValidationIssue {
  code: string;
  message: string;
}

export interface GeometryValidationResult {
  pass: boolean;
  issues: GeometryValidationIssue[];
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

export function validateGeometryProfileV2(
  profile: GeometryProfileV2,
): GeometryValidationResult {
  const issues: GeometryValidationIssue[] = [];
  const bounds = profile.garmentBounds;

  if (!pointInsideRect(profile.factoryOrigin, bounds)) {
    issues.push({
      code: "factory_origin_outside_garment",
      message: `Factory origin (${profile.factoryOrigin.x}, ${profile.factoryOrigin.y}) outside garment bounds`,
    });
  }

  if (profile.collarBottom.y <= profile.alphaBoundingBox.top) {
    issues.push({
      code: "collar_bottom_at_alpha_top",
      message:
        "Collar bottom must not equal alpha bbox top (use anatomy-derived collar bottom)",
    });
  }

  if (profile.collarBottom.y < profile.alphaBoundingBox.top) {
    issues.push({
      code: "collar_bottom_above_alpha_top",
      message: "Collar bottom is above alpha bounding box top",
    });
  }

  if (!rectContains(profile.artworkStage, bounds)) {
    issues.push({
      code: "artwork_stage_outside_garment",
      message: "Artwork stage is not fully inside garment alpha bounds",
    });
  }

  if (!rectContains(profile.safeArea, profile.artworkStage)) {
    issues.push({
      code: "safe_area_outside_artwork_stage",
      message: "Safe area is not fully inside artwork stage",
    });
  }

  if (profile.factoryOrigin.offsetCm !== (profile.side === "front" ? 7 : 5)) {
    issues.push({
      code: "factory_offset_mismatch",
      message: `Factory offset cm mismatch for ${profile.side}`,
    });
  }

  const expectedStageTop =
    profile.factoryOrigin.y +
    profile.factoryOrigin.offsetCm * profile.factoryOrigin.pxPerCm;
  if (Math.abs(profile.artworkStage.top - expectedStageTop) > 0.5) {
    issues.push({
      code: "artwork_stage_top_mismatch",
      message: `Artwork stage top ${profile.artworkStage.top} != factory origin + offset (${expectedStageTop})`,
    });
  }

  return {
    pass: issues.length === 0,
    issues,
  };
}

export function formatGeometryValidationReport(
  profile: GeometryProfileV2,
  result: GeometryValidationResult,
): string {
  const status = result.pass ? "PASS" : "FAIL";
  const lines = [
    `[${status}] ${profile.colorSlug}/${profile.side}`,
    `  factoryOrigin: (${profile.factoryOrigin.x}, ${profile.factoryOrigin.y}) offset=${profile.factoryOrigin.offsetCm}cm`,
    `  collarBottom: (${profile.collarBottom.x}, ${profile.collarBottom.y}) neckW=${profile.collarBottom.neckWidthPx}px`,
    `  artworkStage: top=${profile.artworkStage.top.toFixed(2)} left=${profile.artworkStage.left.toFixed(2)} ${profile.artworkStage.width.toFixed(1)}×${profile.artworkStage.height.toFixed(1)}`,
    `  safeArea: top=${profile.safeArea.top.toFixed(2)} ${profile.safeArea.width.toFixed(1)}×${profile.safeArea.height.toFixed(1)}`,
  ];
  if (result.issues.length > 0) {
    lines.push(
      ...result.issues.map((issue) => `  ! ${issue.code}: ${issue.message}`),
    );
  }
  return lines.join("\n");
}
