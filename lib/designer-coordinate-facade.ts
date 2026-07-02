/**
 * Designer Coordinate Projection Facade — Step 13.0C
 * ───────────────────────────────────────────────────
 * 唯一 Workspace ↔ Designer（Current Garment Printable）投影入口。
 *
 * Storage / Runtime 仍使用 Workspace M cm；本模組尚未接入任何 UI 或互動 Runtime。
 *
 * Designer Coordinate：0 … garmentPrintArea.width × 0 … garmentPrintArea.height
 * Workspace Storage：0 … workspacePrintArea.width × 0 … workspacePrintArea.height（固定 M）
 */

import type { Side } from "./constants";
import type { LayerCmRect, PrintAreaCmBounds } from "./design-cm";
import { getLayerInspectorCmRect } from "./design-inspector";
import { getDesignerWorkspacePrintAreaCm } from "./designer-workspace";
import { resolveGarmentPrintAreaCm } from "./garment-anchor-runtime";
import type { DesignLayer } from "./types";

export interface DesignerCoordinatePoint {
  x_cm: number;
  y_cm: number;
}

export interface DesignerCoordinateContext {
  side: Side;
  size: string;
  workspacePrintArea: PrintAreaCmBounds;
  garmentPrintArea: PrintAreaCmBounds;
}

export interface DesignerCssPercentStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

export type DesignerLengthAxis = "x" | "y";

/** Designer 空間完整圖層投影（含 rect + rotation + scale） */
export interface DesignerLayerProjection {
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
  rotation: number;
  scale: number;
  /** Text：Designer 空間有效字級（fontSize_cm × scale 投影後） */
  fontSize_cm?: number;
}

/** Designer 空間圖層 patch（互動輸入） */
export interface DesignerLayerPatch {
  x_cm?: number;
  y_cm?: number;
  width_cm?: number;
  height_cm?: number;
  rotation?: number;
  scale?: number;
  fontSize_cm?: number;
}

/** Workspace Storage patch（Controller 輸出） */
export interface WorkspaceLayerPatch {
  x_cm?: number;
  y_cm?: number;
  width_cm?: number;
  height_cm?: number;
  rotation?: number;
  scale?: number;
  fontSize_cm?: number;
}

function readLayerScale(layer: DesignLayer): number {
  if (layer.type === "text" || layer.type === "image" || layer.type === "shape") {
    return layer.scale;
  }
  return 1;
}

function getWorkspaceToDesignerScale(ctx: DesignerCoordinateContext): {
  scaleX: number;
  scaleY: number;
} {
  const { workspacePrintArea, garmentPrintArea } = ctx;
  return {
    scaleX: garmentPrintArea.width / workspacePrintArea.width,
    scaleY: garmentPrintArea.height / workspacePrintArea.height,
  };
}

function getDesignerToWorkspaceScale(ctx: DesignerCoordinateContext): {
  scaleX: number;
  scaleY: number;
} {
  const { workspacePrintArea, garmentPrintArea } = ctx;
  return {
    scaleX: workspacePrintArea.width / garmentPrintArea.width,
    scaleY: workspacePrintArea.height / garmentPrintArea.height,
  };
}

/** 建立投影 Context（side + size → workspace M 與 current garment printable area） */
export function createDesignerCoordinateContext(
  side: Side,
  size: string,
): DesignerCoordinateContext {
  return {
    side,
    size,
    workspacePrintArea: getDesignerWorkspacePrintAreaCm(side),
    garmentPrintArea: resolveGarmentPrintAreaCm(size, side),
  };
}

/** Workspace Storage rect → Designer（Current Garment Printable）rect */
export function workspaceRectToDesignerRect(
  rect: LayerCmRect,
  ctx: DesignerCoordinateContext,
): LayerCmRect {
  const { scaleX, scaleY } = getWorkspaceToDesignerScale(ctx);
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

/** Designer rect → Workspace Storage rect */
export function designerRectToWorkspaceRect(
  rect: LayerCmRect,
  ctx: DesignerCoordinateContext,
): LayerCmRect {
  const { scaleX, scaleY } = getDesignerToWorkspaceScale(ctx);
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

/** Workspace point → Designer point */
export function workspacePointToDesignerPoint(
  point: DesignerCoordinatePoint,
  ctx: DesignerCoordinateContext,
): DesignerCoordinatePoint {
  const { scaleX, scaleY } = getWorkspaceToDesignerScale(ctx);
  return {
    x_cm: point.x_cm * scaleX,
    y_cm: point.y_cm * scaleY,
  };
}

/** Designer point → Workspace point */
export function designerPointToWorkspacePoint(
  point: DesignerCoordinatePoint,
  ctx: DesignerCoordinateContext,
): DesignerCoordinatePoint {
  const { scaleX, scaleY } = getDesignerToWorkspaceScale(ctx);
  return {
    x_cm: point.x_cm * scaleX,
    y_cm: point.y_cm * scaleY,
  };
}

/** Workspace 長度 → Designer 長度（水平用 x 軸比例，垂直用 y 軸比例） */
export function workspaceLengthToDesignerLength(
  lengthCm: number,
  ctx: DesignerCoordinateContext,
  axis: DesignerLengthAxis,
): number {
  const { scaleX, scaleY } = getWorkspaceToDesignerScale(ctx);
  return lengthCm * (axis === "x" ? scaleX : scaleY);
}

/** Designer 長度 → Workspace 長度 */
export function designerLengthToWorkspaceLength(
  lengthCm: number,
  ctx: DesignerCoordinateContext,
  axis: DesignerLengthAxis,
): number {
  const { scaleX, scaleY } = getDesignerToWorkspaceScale(ctx);
  return lengthCm * (axis === "x" ? scaleX : scaleY);
}

/** Designer printable area（Current Garment Blue 印刷區 cm 邊界） */
export function getDesignerPrintableArea(
  ctx: DesignerCoordinateContext,
): PrintAreaCmBounds {
  return ctx.garmentPrintArea;
}

/**
 * Designer rect → 固定 Workspace 視覺容器內 CSS %。
 * 分母為 Current Garment Printable Area（非 Workspace M）。
 */
export function toDesignerCssPercent(
  designerRect: LayerCmRect,
  ctx: DesignerCoordinateContext,
): DesignerCssPercentStyle {
  const printArea = getDesignerPrintableArea(ctx);
  return {
    left: `${(designerRect.x_cm / printArea.width) * 100}%`,
    top: `${(designerRect.y_cm / printArea.height) * 100}%`,
    width: `${(designerRect.width_cm / printArea.width) * 100}%`,
    height: `${(designerRect.height_cm / printArea.height) * 100}%`,
  };
}

/**
 * Workspace Storage rect → CSS %（Step 13.0D Display Layer）。
 * 線性投影下與 workspace ÷ workspacePrintArea 的 % 相同，視覺零漂移。
 */
export function toDesignerCssPercentFromWorkspace(
  workspaceRect: LayerCmRect,
  ctx: DesignerCoordinateContext,
): DesignerCssPercentStyle {
  return toDesignerCssPercent(
    workspaceRectToDesignerRect(workspaceRect, ctx),
    ctx,
  );
}

/** Storage layer → Designer 完整投影（rect + rotation + scale + text fontSize） */
export function projectLayerToDesigner(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
): DesignerLayerProjection {
  const workspaceRect = getLayerInspectorCmRect(layer);
  const designerRect = workspaceRectToDesignerRect(workspaceRect, ctx);
  const scale = readLayerScale(layer);
  const projection: DesignerLayerProjection = {
    ...designerRect,
    rotation: layer.rotation,
    scale,
  };
  if (layer.type === "text") {
    projection.fontSize_cm = workspaceLengthToDesignerLength(
      layer.fontSize_cm * scale,
      ctx,
      "y",
    );
  }
  return projection;
}

/** Designer 完整投影 → Workspace Storage patch */
export function projectLayerToWorkspace(
  designer: DesignerLayerProjection,
  ctx: DesignerCoordinateContext,
): WorkspaceLayerPatch {
  const workspaceRect = designerRectToWorkspaceRect(
    {
      x_cm: designer.x_cm,
      y_cm: designer.y_cm,
      width_cm: designer.width_cm,
      height_cm: designer.height_cm,
    },
    ctx,
  );
  const patch: WorkspaceLayerPatch = {
    ...workspaceRect,
    rotation: designer.rotation,
    scale: designer.scale,
  };
  if (designer.fontSize_cm !== undefined) {
    const workspaceEffective = designerLengthToWorkspaceLength(
      designer.fontSize_cm,
      ctx,
      "y",
    );
    patch.fontSize_cm = workspaceEffective / designer.scale;
  }
  return patch;
}

/**
 * Designer patch → Workspace patch（各欄位獨立投影；rotation / scale 直通）。
 * 用於局部更新；完整 rect 變更請優先合併後 projectLayerToWorkspace。
 */
export function projectLayerPatchToWorkspace(
  patch: DesignerLayerPatch,
  ctx: DesignerCoordinateContext,
): WorkspaceLayerPatch {
  const workspacePatch: WorkspaceLayerPatch = {};
  if (patch.x_cm !== undefined || patch.y_cm !== undefined) {
    const designerPoint = {
      x_cm: patch.x_cm ?? 0,
      y_cm: patch.y_cm ?? 0,
    };
    const workspacePoint = designerPointToWorkspacePoint(designerPoint, ctx);
    if (patch.x_cm !== undefined) workspacePatch.x_cm = workspacePoint.x_cm;
    if (patch.y_cm !== undefined) workspacePatch.y_cm = workspacePoint.y_cm;
  }
  if (patch.width_cm !== undefined) {
    workspacePatch.width_cm = designerLengthToWorkspaceLength(
      patch.width_cm,
      ctx,
      "x",
    );
  }
  if (patch.height_cm !== undefined) {
    workspacePatch.height_cm = designerLengthToWorkspaceLength(
      patch.height_cm,
      ctx,
      "y",
    );
  }
  if (patch.rotation !== undefined) workspacePatch.rotation = patch.rotation;
  if (patch.scale !== undefined) workspacePatch.scale = patch.scale;
  if (patch.fontSize_cm !== undefined) {
    const workspaceEffective = designerLengthToWorkspaceLength(
      patch.fontSize_cm,
      ctx,
      "y",
    );
    const scale = patch.scale ?? 1;
    workspacePatch.fontSize_cm = workspaceEffective / scale;
  }
  return workspacePatch;
}
