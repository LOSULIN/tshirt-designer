/**
 * Designer Display Projection — Step 13.0D
 * Display-only adapters; reads delegate to facade, writes delegate to controller.
 */

import type { Side } from "./constants";
import type { LayerCmRect } from "./design-cm";
import {
  createDesignerCoordinateContext,
  getDesignerPrintableArea,
  projectLayerToDesigner,
  toDesignerCssPercentFromWorkspace,
  workspaceLengthToDesignerLength,
  workspacePointToDesignerPoint,
  workspaceRectToDesignerRect,
  type DesignerCoordinateContext,
  type DesignerCoordinatePoint,
  type DesignerCssPercentStyle,
  type DesignerLengthAxis,
} from "./designer-coordinate-facade";
import { getLayerInspectorCmRect } from "./design-inspector";
import type { DesignLayer } from "./types";

export { createDesignerCoordinateContext, getDesignerPrintableArea };
export type { DesignerCoordinateContext, DesignerCssPercentStyle };

export function getLayerWorkspaceInspectorRect(layer: DesignLayer): LayerCmRect {
  return getLayerInspectorCmRect(layer);
}

export function projectWorkspaceRectToDesignerDisplay(
  workspaceRect: LayerCmRect,
  ctx: DesignerCoordinateContext,
): LayerCmRect {
  return workspaceRectToDesignerRect(workspaceRect, ctx);
}

export function projectWorkspacePointToDesignerDisplay(
  point: DesignerCoordinatePoint,
  ctx: DesignerCoordinateContext,
): DesignerCoordinatePoint {
  return workspacePointToDesignerPoint(point, ctx);
}

export function projectWorkspaceLengthToDesignerDisplay(
  lengthCm: number,
  ctx: DesignerCoordinateContext,
  axis: DesignerLengthAxis = "y",
): number {
  return workspaceLengthToDesignerLength(lengthCm, ctx, axis);
}

export function getLayerDesignerDisplayRect(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
): LayerCmRect {
  const projection = projectLayerToDesigner(layer, ctx);
  return {
    x_cm: projection.x_cm,
    y_cm: projection.y_cm,
    width_cm: projection.width_cm,
    height_cm: projection.height_cm,
  };
}

export function getLayerDesignerDisplayCssPercent(
  workspaceRect: LayerCmRect,
  ctx: DesignerCoordinateContext,
): DesignerCssPercentStyle {
  return toDesignerCssPercentFromWorkspace(workspaceRect, ctx);
}

export function createDesignerDisplayContext(
  side: Side,
  size: string,
): DesignerCoordinateContext {
  return createDesignerCoordinateContext(side, size);
}

/** 唯讀：完整 Designer 圖層投影（含 rotation / scale / fontSize） */
export function getLayerDesignerProjection(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
) {
  return projectLayerToDesigner(layer, ctx);
}
