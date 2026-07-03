/**
 * Designer Display Scale — Phase 14.1
 * Fixed visual blue frame; printable cm dimensions vary by garment size.
 * Display-only: reads Facade / Workspace, never writes storage or runtime state.
 */

import type { Side } from "./constants";
import type { LayerCmRect, PrintAreaCmBounds } from "./design-cm";
import { getDesignerOrangeSafeZonePctInBlue } from "./coordinates/preview";
import {
  getDesignerPrintableArea,
  toDesignerCssPercentFromWorkspace,
  type DesignerCoordinateContext,
  type DesignerCssPercentStyle,
} from "./designer-coordinate-facade";
import { getDesignerWorkspacePrintAreaCm } from "./designer-workspace";
import { formatGarmentPrintAreaCmPair } from "./garment-constraint-ux";

export interface DisplayLayoutPct {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

const PCT_EPS = 0.05;

/** Fixed blue frame visual anchor (Workspace M template rect). */
export function getFixedDisplayBlueFrameCm(side: Side): PrintAreaCmBounds {
  return getDesignerWorkspacePrintAreaCm(side);
}

/** Current garment printable area for display labels and scale. */
export function getDisplayGarmentPrintableCm(
  ctx: DesignerCoordinateContext,
): PrintAreaCmBounds {
  return getDesignerPrintableArea(ctx);
}

/**
 * Printable region inside the fixed blue frame.
 * Phase 14.1: garment ≤ workspace M → full frame (100%) represents garment printable cm.
 * Garment larger than workspace M (e.g. XXXL) → proportional inset + exclusion masks.
 */
export function getDisplayPrintableRegionPct(
  fixedFrame: PrintAreaCmBounds,
  garmentPrintable: PrintAreaCmBounds,
): DisplayLayoutPct {
  const widthRatio = garmentPrintable.width / fixedFrame.width;
  const heightRatio = garmentPrintable.height / fixedFrame.height;

  if (widthRatio <= 1 + PCT_EPS / 100 && heightRatio <= 1 + PCT_EPS / 100) {
    return { leftPct: 0, topPct: 0, widthPct: 100, heightPct: 100 };
  }

  const widthPct = widthRatio * 100;
  const heightPct = heightRatio * 100;
  return {
    leftPct: 0,
    topPct: 0,
    widthPct: Math.min(100, widthPct),
    heightPct: Math.min(100, heightPct),
  };
}

/** Exclusion masks when garment printable exceeds fixed frame storage bounds. */
export function getDisplayExclusionMaskRects(
  fixedFrame: PrintAreaCmBounds,
  garmentPrintable: PrintAreaCmBounds,
): DisplayLayoutPct[] {
  const printable = getDisplayPrintableRegionPct(fixedFrame, garmentPrintable);
  const masks: DisplayLayoutPct[] = [];

  if (printable.widthPct < 100 - PCT_EPS) {
    masks.push({
      leftPct: printable.widthPct,
      topPct: 0,
      widthPct: 100 - printable.widthPct,
      heightPct: 100,
    });
  }

  if (printable.heightPct < 100 - PCT_EPS) {
    masks.push({
      leftPct: 0,
      topPct: printable.heightPct,
      widthPct: printable.widthPct,
      heightPct: 100 - printable.heightPct,
    });
  }

  return masks;
}

/** Recommended safe zone as % of fixed blue frame (size-aware). */
export function getDisplayOrangeSafeZonePct(
  side: Side,
  size: string,
): DisplayLayoutPct {
  return getDesignerOrangeSafeZonePctInBlue(size, side);
}

/** Workspace rect → CSS % where 100% of fixed blue frame = current garment printable. */
export function workspaceRectToDisplayCssPercent(
  workspaceRect: LayerCmRect,
  ctx: DesignerCoordinateContext,
): DesignerCssPercentStyle {
  return toDesignerCssPercentFromWorkspace(workspaceRect, ctx);
}

export function buildDisplayBlueFrameTooltip(params: {
  side: Side;
  size: string;
  garmentPrintable: PrintAreaCmBounds;
}): string {
  const { side, size, garmentPrintable } = params;
  const garment = formatGarmentPrintAreaCmPair(garmentPrintable);
  const sideLabel = side === "front" ? "正面" : "背面";
  return [
    `尺碼 ${size}（${sideLabel}）`,
    `藍框視覺大小固定；100% 寬度 = ${garmentPrintable.width} cm`,
    `可印範圍：${garment} cm`,
    "切換尺碼時僅代表的可印尺寸與格線比例改變，藍框不縮放。",
  ].join("\n");
}
