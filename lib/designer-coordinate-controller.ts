/**
 * Designer Coordinate Controller — Step 13.0E
 * ───────────────────────────────────────────
 * Designer Coordinate → Workspace Storage 唯一寫入入口（Pure Functions）。
 *
 * 不讀 DOM、不依賴 React、不修改 Storage Schema。
 * 所有互動 Runtime 於 Step 13.0F 起改經本 Controller；本步僅建立 API。
 */

import type { LayerCmRect, PrintAreaCmBounds } from "./design-cm";
import { getLayerInspectorCmRect } from "./design-inspector";
import {
  getDesignerWorkspacePrintAreaCm,
} from "./designer-workspace";
import { getInitialPlacement } from "./geometry";
import {
  alignDesignLayers,
  type LayerAlignmentAxis,
} from "./layer-alignment";
import type { FitRasterImageOptions } from "./image-print-quality";
import {
  fitImageLayer,
  fitShapeLayer,
  fitTextLayer,
  type FitTextLayerOptions,
} from "./layer-constraints";
import { getStaggeredPlacement } from "./layer-placement";
import {
  applyLayerPlacementPreset,
  type PlacementPreset,
} from "./placement-presets";
import { createDefaultShapeLayer } from "./shape-layer";
import { createDefaultTextLayer } from "./text-layer";
import { DEFAULT_RICH_TEXT_FIELDS } from "./text-style";
import { defaultLayerName, getNextZIndex } from "./layers";
import type { ShapeKind, TextDesignLayer, ShapeDesignLayer } from "./types";
import {
  createDesignerCoordinateContext,
  designerPointToWorkspacePoint,
  designerRectToWorkspaceRect,
  getDesignerPrintableArea,
  projectLayerPatchToWorkspace,
  projectLayerToDesigner,
  projectLayerToWorkspace,
  workspaceLengthToDesignerLength,
  workspacePointToDesignerPoint,
  workspaceRectToDesignerRect,
  type DesignerCoordinateContext,
  type DesignerLayerPatch,
  type DesignerLayerProjection,
  type WorkspaceLayerPatch,
} from "./designer-coordinate-facade";
import type { Side } from "./constants";
import {
  GRID_SIZE_CM,
  GRID_SNAP_THRESHOLD_CM,
} from "./constants";
import type { SnapTarget } from "./element-snap";
import type { ElementAlignmentGuides } from "./element-snap";
import { applyDragSnap, type DragSnapResult } from "./geometry";
import { buildSnapTargetsFromLayers } from "./snap-targets";
import type { DesignLayer } from "./types";

export type {
  DesignerCoordinateContext,
  DesignerLayerPatch,
  DesignerLayerProjection,
  WorkspaceLayerPatch,
};

export { createDesignerCoordinateContext as createDesignerCoordinateControllerContext };

/** Step 13.0F：Pointer Drag 起始狀態（Designer Coordinate） */
export interface DesignerPointerDragState {
  originDesignerX_cm: number;
  originDesignerY_cm: number;
}

/** Step 13.0F：螢幕像素位移 → Designer cm 位移 */
export function clientPixelDeltaToDesignerCm(
  deltaXPx: number,
  deltaYPx: number,
  printRect: { width: number; height: number },
  ctx: DesignerCoordinateContext,
): { dx_cm: number; dy_cm: number } {
  const printable = getDesignerPrintableArea(ctx);
  return {
    dx_cm: deltaXPx * (printable.width / printRect.width),
    dy_cm: deltaYPx * (printable.height / printRect.height),
  };
}

/** 建立 Pointer Drag 起始狀態（從目前 layer 投影） */
export function createDesignerPointerDragState(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
): DesignerPointerDragState {
  const projection = projectLayerToDesigner(layer, ctx);
  return {
    originDesignerX_cm: projection.x_cm,
    originDesignerY_cm: projection.y_cm,
  };
}

/**
 * Pointer Drag：Designer 目標位置 → Workspace Storage patch。
 * Geometry snap/clamp 由呼叫端以 workspace 座標執行（geometry.ts 不變）。
 */
export function resolveDesignerDragWorkspacePatch(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  drag: DesignerPointerDragState,
  designerPosition: { x_cm: number; y_cm: number },
): WorkspaceLayerPatch {
  void drag;
  return setLayerDesignerPosition(layer, ctx, designerPosition);
}

/** Step 13.0G：Pointer Resize 起始狀態（Designer Coordinate） */
export interface DesignerPointerResizeState {
  originDesignerX_cm: number;
  originDesignerY_cm: number;
  originDesignerWidth_cm: number;
  originDesignerHeight_cm: number;
}

/** Step 13.0G：螢幕座標 → Designer cm 點 */
export function clientPointToDesignerCm(
  clientX: number,
  clientY: number,
  printRect: { left: number; top: number; width: number; height: number },
  ctx: DesignerCoordinateContext,
): { x_cm: number; y_cm: number } {
  const printable = getDesignerPrintableArea(ctx);
  return {
    x_cm: ((clientX - printRect.left) / printRect.width) * printable.width,
    y_cm: ((clientY - printRect.top) / printRect.height) * printable.height,
  };
}

/** 建立 Pointer Resize 起始狀態（從目前 layer Designer 投影） */
export function createDesignerPointerResizeState(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
): DesignerPointerResizeState {
  const projection = projectLayerToDesigner(layer, ctx);
  return {
    originDesignerX_cm: projection.x_cm,
    originDesignerY_cm: projection.y_cm,
    originDesignerWidth_cm: projection.width_cm,
    originDesignerHeight_cm: projection.height_cm,
  };
}

/** Workspace 最大印刷尺寸 → Designer 空間上限（供 computeHandleResizeCm） */
export function projectWorkspaceMaxResizeToDesigner(
  maxWidth_cm: number | undefined,
  maxHeight_cm: number | undefined,
  ctx: DesignerCoordinateContext,
): { maxWidth_cm?: number; maxHeight_cm?: number } {
  return {
    maxWidth_cm:
      maxWidth_cm == null
        ? undefined
        : workspaceLengthToDesignerLength(maxWidth_cm, ctx, "x"),
    maxHeight_cm:
      maxHeight_cm == null
        ? undefined
        : workspaceLengthToDesignerLength(maxHeight_cm, ctx, "y"),
  };
}

/**
 * Pointer Resize：Designer rect（computeHandleResizeCm 輸出）→ Workspace patch。
 * computeHandleResizeCm 仍於 Designer 空間執行；幾何模組不變。
 */
export function resolveDesignerHandleResizeWorkspacePatch(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  designerRect: LayerCmRect,
): WorkspaceLayerPatch {
  return applyDesignerLayerPatch(layer, ctx, {
    x_cm: designerRect.x_cm,
    y_cm: designerRect.y_cm,
    width_cm: designerRect.width_cm,
    height_cm: designerRect.height_cm,
  });
}

/** 以 Designer 位移增量解析 Workspace patch */
export function resolveDesignerDragDeltaWorkspacePatch(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  drag: DesignerPointerDragState,
  deltaDesigner: { dx_cm: number; dy_cm: number },
): WorkspaceLayerPatch {
  return resolveDesignerDragWorkspacePatch(layer, ctx, drag, {
    x_cm: drag.originDesignerX_cm + deltaDesigner.dx_cm,
    y_cm: drag.originDesignerY_cm + deltaDesigner.dy_cm,
  });
}

function workspaceRectFromDesignerRect(
  designerRect: LayerCmRect,
  ctx: DesignerCoordinateContext,
): WorkspaceLayerPatch {
  return designerRectToWorkspaceRect(designerRect, ctx);
}

function mergeDesignerProjection(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  patch: DesignerLayerPatch,
): DesignerLayerProjection {
  const current = projectLayerToDesigner(layer, ctx);
  return {
    x_cm: patch.x_cm ?? current.x_cm,
    y_cm: patch.y_cm ?? current.y_cm,
    width_cm: patch.width_cm ?? current.width_cm,
    height_cm: patch.height_cm ?? current.height_cm,
    rotation: patch.rotation ?? current.rotation,
    scale: patch.scale ?? current.scale,
    fontSize_cm: patch.fontSize_cm ?? current.fontSize_cm,
  };
}

/** 設定 Designer 位置 → Workspace { x_cm, y_cm } */
export function setLayerDesignerPosition(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  position: { x_cm: number; y_cm: number },
): WorkspaceLayerPatch {
  const current = projectLayerToDesigner(layer, ctx);
  return workspaceRectFromDesignerRect(
    {
      x_cm: position.x_cm,
      y_cm: position.y_cm,
      width_cm: current.width_cm,
      height_cm: current.height_cm,
    },
    ctx,
  );
}

/** 設定 Designer 尺寸（維持中心）→ Workspace rect */
export function setLayerDesignerSize(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  size: { width_cm: number; height_cm: number },
): WorkspaceLayerPatch {
  const current = projectLayerToDesigner(layer, ctx);
  const centerX = current.x_cm + current.width_cm / 2;
  const centerY = current.y_cm + current.height_cm / 2;
  return workspaceRectFromDesignerRect(
    {
      x_cm: centerX - size.width_cm / 2,
      y_cm: centerY - size.height_cm / 2,
      width_cm: size.width_cm,
      height_cm: size.height_cm,
    },
    ctx,
  );
}

/** 設定 Designer 完整 rect → Workspace rect */
export function setLayerDesignerRect(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  rect: LayerCmRect,
): WorkspaceLayerPatch {
  void layer;
  return workspaceRectFromDesignerRect(rect, ctx);
}

/** Designer 空間平移 → Workspace position patch */
export function moveLayerDesigner(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  delta: { dx_cm: number; dy_cm: number },
): WorkspaceLayerPatch {
  const current = projectLayerToDesigner(layer, ctx);
  return workspaceRectFromDesignerRect(
    {
      x_cm: current.x_cm + delta.dx_cm,
      y_cm: current.y_cm + delta.dy_cm,
      width_cm: current.width_cm,
      height_cm: current.height_cm,
    },
    ctx,
  );
}

/** 設定 Designer 尺寸（同 setLayerDesignerSize） */
export function resizeLayerDesigner(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  size: { width_cm: number; height_cm: number },
): WorkspaceLayerPatch {
  return setLayerDesignerSize(layer, ctx, size);
}

/** 設定旋轉（角度直通，無座標投影） */
export function setLayerDesignerRotation(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  rotation: number,
): WorkspaceLayerPatch {
  void layer;
  void ctx;
  return { rotation };
}

/** 設定位置 + 旋轉 + 縮放（Designer 輸入） */
export function setLayerDesignerTransform(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  transform: DesignerLayerPatch,
): WorkspaceLayerPatch {
  return applyDesignerLayerPatch(layer, ctx, transform);
}

/**
 * 套用 Designer patch → Workspace patch。
 * 合併目前 Designer 投影後整體轉換 rect；獨立欄位亦支援局部 patch。
 */
export function applyDesignerLayerPatch(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  patch: DesignerLayerPatch,
): WorkspaceLayerPatch {
  const hasRectKey =
    patch.x_cm !== undefined ||
    patch.y_cm !== undefined ||
    patch.width_cm !== undefined ||
    patch.height_cm !== undefined;

  if (!hasRectKey) {
    return projectLayerPatchToWorkspace(patch, ctx);
  }

  const merged = mergeDesignerProjection(layer, ctx, patch);
  const workspaceFromProjection = projectLayerToWorkspace(merged, ctx);
  const result: WorkspaceLayerPatch = {};

  if (patch.x_cm !== undefined) result.x_cm = workspaceFromProjection.x_cm;
  if (patch.y_cm !== undefined) result.y_cm = workspaceFromProjection.y_cm;
  if (patch.width_cm !== undefined) result.width_cm = workspaceFromProjection.width_cm;
  if (patch.height_cm !== undefined) result.height_cm = workspaceFromProjection.height_cm;
  if (patch.rotation !== undefined) result.rotation = workspaceFromProjection.rotation;
  if (patch.scale !== undefined) result.scale = workspaceFromProjection.scale;
  if (patch.fontSize_cm !== undefined) {
    result.fontSize_cm = workspaceFromProjection.fontSize_cm;
  }

  return result;
}

/** 讀取目前圖層 Designer 投影（唯讀；供 UI / Runtime 查詢） */
export function readLayerDesignerProjection(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
): DesignerLayerProjection {
  return projectLayerToDesigner(layer, ctx);
}

/** 建立 Controller context（side + size） */
export function createControllerContext(
  side: Side,
  size: string,
): DesignerCoordinateContext {
  return createDesignerCoordinateContext(side, size);
}

/** Step 13.0H：Creation / Placement fit 選項 */
export interface DesignerCreationFitOptions {
  rasterFit?: FitRasterImageOptions;
  largePrintMode?: boolean;
}

/** Step 13.0M：Auto-Fit / Hydration fit 選項 */
export interface DesignerFitOptions extends DesignerCreationFitOptions {
  textFit?: FitTextLayerOptions;
}

function readLayerScaleFromDesignLayer(layer: DesignLayer): number {
  if (layer.type === "text" || layer.type === "image" || layer.type === "shape") {
    return layer.scale;
  }
  return 1;
}

function layerWithDesignerRectInStorageFields(
  layer: DesignLayer,
  projection: DesignerLayerProjection,
): DesignLayer {
  return {
    ...layer,
    x_cm: projection.x_cm,
    y_cm: projection.y_cm,
    width_cm: projection.width_cm,
    height_cm: projection.height_cm,
    rotation: projection.rotation,
    scale: projection.scale,
    ...(layer.type === "text" && projection.fontSize_cm !== undefined
      ? { fontSize_cm: projection.fontSize_cm / projection.scale }
      : {}),
  } as DesignLayer;
}

function designerProjectionFromDesignerSpaceLayer(
  layer: DesignLayer,
): DesignerLayerProjection {
  const rect = getLayerInspectorCmRect(layer);
  const scale = readLayerScaleFromDesignLayer(layer);
  const projection: DesignerLayerProjection = {
    ...rect,
    rotation: layer.rotation,
    scale,
  };
  if (layer.type === "text") {
    projection.fontSize_cm = layer.fontSize_cm * scale;
  }
  return projection;
}

function mergeWorkspacePatchIntoLayer(
  layer: DesignLayer,
  patch: WorkspaceLayerPatch,
): DesignLayer {
  const next: Record<string, unknown> = { ...layer };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      next[key] = value;
    }
  }
  return next as DesignLayer;
}

/** 於 Designer 空間 fit，再經 Controller 寫回 Workspace Storage */
function fitLayerInDesignerCoordinate(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  options?: DesignerFitOptions,
): DesignLayer {
  const designerPrintArea = getDesignerPrintableArea(ctx);
  const designerLayer = layerWithDesignerRectInStorageFields(
    layer,
    projectLayerToDesigner(layer, ctx),
  );
  const textFitOptions =
    options?.textFit?.anchorCenter != null
      ? {
          ...options.textFit,
          anchorCenter: workspacePointToDesignerPoint(
            options.textFit.anchorCenter,
            ctx,
          ),
        }
      : options?.textFit;

  let fitted: DesignLayer;
  if (layer.type === "text") {
    fitted = fitTextLayer(designerLayer, designerPrintArea, textFitOptions);
  } else if (layer.type === "shape") {
    fitted = fitShapeLayer(designerLayer, designerPrintArea);
  } else {
    fitted = fitImageLayer(
      designerLayer,
      designerPrintArea,
      options?.rasterFit,
    );
  }

  const workspacePatch = projectLayerToWorkspace(
    designerProjectionFromDesignerSpaceLayer(fitted),
    ctx,
  );
  return mergeWorkspacePatchIntoLayer(layer, workspacePatch);
}

function workspacePatchFromFitResult(
  original: DesignLayer,
  fitted: DesignLayer,
): WorkspaceLayerPatch {
  const patch: WorkspaceLayerPatch = {};
  let changed = false;
  if (Math.abs(fitted.x_cm - original.x_cm) > 1e-6) {
    patch.x_cm = fitted.x_cm;
    changed = true;
  }
  if (Math.abs(fitted.y_cm - original.y_cm) > 1e-6) {
    patch.y_cm = fitted.y_cm;
    changed = true;
  }
  if (
    (fitted.type === "text" ||
      fitted.type === "image" ||
      fitted.type === "shape") &&
    Math.abs(fitted.scale - original.scale) > 1e-6
  ) {
    patch.scale = fitted.scale;
    changed = true;
  }
  if (fitted.type === "text" && fitted.fontSize_cm !== original.fontSize_cm) {
    patch.fontSize_cm = fitted.fontSize_cm;
    changed = true;
  }
  if (
    (fitted.type === "image" || fitted.type === "shape") &&
    (Math.abs(fitted.width_cm - original.width_cm) > 1e-6 ||
      Math.abs(fitted.height_cm - original.height_cm) > 1e-6)
  ) {
    patch.width_cm = fitted.width_cm;
    patch.height_cm = fitted.height_cm;
    changed = true;
  }
  if (Math.abs(fitted.rotation - original.rotation) > 1e-6) {
    patch.rotation = fitted.rotation;
    changed = true;
  }
  return changed ? patch : {};
}

/** Step 13.0H：Placement Preset → Workspace layer（preset 幾何不變） */
export function applyDesignerPlacementPreset(
  layer: DesignLayer,
  preset: PlacementPreset,
  ctx: DesignerCoordinateContext,
  options?: DesignerCreationFitOptions,
): DesignLayer {
  void ctx;
  const side = preset.sides[0] ?? "front";
  return applyLayerPlacementPreset(
    layer,
    preset,
    getDesignerWorkspacePrintAreaCm(side),
    { largePrintMode: options?.largePrintMode },
  );
}

/** Placement Preset → Workspace patch */
export function createDesignerPlacementPatch(
  layer: DesignLayer,
  preset: PlacementPreset,
  ctx: DesignerCoordinateContext,
  options?: DesignerCreationFitOptions,
): WorkspaceLayerPatch {
  const result = applyDesignerPlacementPreset(layer, preset, ctx, options);
  const patch: WorkspaceLayerPatch = {
    x_cm: result.x_cm,
    y_cm: result.y_cm,
    width_cm: result.width_cm,
    height_cm: result.height_cm,
    rotation: result.rotation,
  };
  if (result.type === "text" || result.type === "image" || result.type === "shape") {
    patch.scale = result.scale;
  }
  if (result.type === "text") {
    patch.fontSize_cm = result.fontSize_cm;
  }
  return patch;
}

/** 上傳初始置入：Designer auto-fit → Workspace rect */
export function createDesignerUploadPlacement(
  imageWidth: number,
  imageHeight: number,
  existingLayerCount: number,
  ctx: DesignerCoordinateContext,
): LayerCmRect {
  const designerPrintArea = getDesignerPrintableArea(ctx);
  const placement = getInitialPlacement(
    imageWidth,
    imageHeight,
    designerPrintArea,
  );
  const stagger = getStaggeredPlacement(
    designerPrintArea,
    placement.width_cm,
    placement.height_cm,
    existingLayerCount,
  );
  return designerRectToWorkspaceRect(
    {
      x_cm: stagger.x_cm,
      y_cm: stagger.y_cm,
      width_cm: placement.width_cm,
      height_cm: placement.height_cm,
    },
    ctx,
  );
}

/** 預設文字圖層：Designer default → Controller → Workspace */
export function createDesignerDefaultTextLayer(
  layers: DesignLayer[],
  ctx: DesignerCoordinateContext,
): TextDesignLayer {
  const designerPrintArea = getDesignerPrintableArea(ctx);
  const base = createDefaultTextLayer(designerPrintArea);
  const stagger = getStaggeredPlacement(
    designerPrintArea,
    base.width_cm,
    base.height_cm,
    layers.length,
  );
  const temp: TextDesignLayer = {
    id: base.id,
    name: defaultLayerName(layers, "text"),
    type: "text",
    visible: true,
    locked: false,
    zIndex: getNextZIndex(layers),
    x_cm: stagger.x_cm,
    y_cm: stagger.y_cm,
    width_cm: base.width_cm,
    height_cm: base.height_cm,
    scale: base.scale,
    rotation: base.rotation,
    text: base.text,
    fontSize_cm: base.fontSize_cm,
    fontFamily: base.fontFamily,
    color: base.color,
    opacity: base.opacity,
    fontWeight: base.fontWeight,
    ...DEFAULT_RICH_TEXT_FIELDS,
  };
  return fitLayerInDesignerCoordinate(temp, ctx) as TextDesignLayer;
}

/** 預設形狀圖層：Designer default → Controller → Workspace */
export function createDesignerDefaultShapeLayer(
  kind: ShapeKind,
  layers: DesignLayer[],
  ctx: DesignerCoordinateContext,
): ShapeDesignLayer {
  const designerPrintArea = getDesignerPrintableArea(ctx);
  const created = createDefaultShapeLayer(kind, layers, designerPrintArea);
  return fitLayerInDesignerCoordinate(created, ctx) as ShapeDesignLayer;
}

/** 複製／貼上後 Auto Fit：Designer fit → Workspace */
export function createDesignerAutoFitLayer(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  options?: DesignerCreationFitOptions,
): DesignLayer {
  return fitLayerInDesignerCoordinate(layer, ctx, options);
}

/** @deprecated 別名 createDesignerAutoFitLayer */
export const createDesignerAutoFitPatch = createDesignerAutoFitLayer;

/** 複製圖層 offset 後 fit（Duplicate / Paste 邊界） */
export function createDesignerDuplicateLayer(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  options?: DesignerCreationFitOptions,
): DesignLayer {
  return createDesignerAutoFitLayer(layer, ctx, options);
}

/** Step 13.0I：Designer Snap 對齊導引（Display 用 Designer cm） */
export interface DesignerSnapGuides {
  printCenterX: boolean;
  printCenterY: boolean;
  elementVertical: number[];
  elementHorizontal: number[];
}

/** Workspace SnapTarget → Designer SnapTarget */
export function projectSnapTargetsToDesigner(
  targets: SnapTarget[],
  ctx: DesignerCoordinateContext,
): SnapTarget[] {
  const sx =
    ctx.garmentPrintArea.width / ctx.workspacePrintArea.width;
  const sy =
    ctx.garmentPrintArea.height / ctx.workspacePrintArea.height;
  return targets.map((target) => ({
    id: target.id,
    x: target.x * sx,
    y: target.y * sy,
    width: target.width * sx,
    height: target.height * sy,
    scale: target.scale,
  }));
}

/** Workspace 對齊導引座標 → Designer cm */
export function projectSnapGuidesToDesigner(
  guides: ElementAlignmentGuides,
  ctx: DesignerCoordinateContext,
): ElementAlignmentGuides {
  const sx =
    ctx.garmentPrintArea.width / ctx.workspacePrintArea.width;
  const sy =
    ctx.garmentPrintArea.height / ctx.workspacePrintArea.height;
  return {
    vertical: guides.vertical.map((v) => v * sx),
    horizontal: guides.horizontal.map((h) => h * sy),
  };
}

/** Designer applyDragSnap 結果 → Workspace patch + Designer 導引 */
export function projectDesignerSnapResultToWorkspace(
  snap: DragSnapResult,
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
): { workspacePatch: WorkspaceLayerPatch; guides: DesignerSnapGuides } {
  const workspacePatch = setLayerDesignerPosition(layer, ctx, {
    x_cm: snap.x,
    y_cm: snap.y,
  });
  return {
    workspacePatch,
    guides: {
      printCenterX: snap.printCenterSnapX,
      printCenterY: snap.printCenterSnapY,
      elementVertical: snap.elementGuides.vertical,
      elementHorizontal: snap.elementGuides.horizontal,
    },
  };
}

export interface DesignerDragSnapOptions {
  gridSnap: boolean;
  elementSnap: boolean;
  /** UI 門檻值（Workspace cm） */
  elementSnapThresholdCm: number;
  /** Workspace SnapTarget（內部投影至 Designer） */
  otherElements: SnapTarget[];
}

/** Designer Printable Area 格線間距（cm） */
export function getDesignerGridSizeCm(ctx: DesignerCoordinateContext): number {
  return workspaceLengthToDesignerLength(GRID_SIZE_CM, ctx, "x");
}

/** 由圖層建立 Designer SnapTarget 列表 */
export function buildDesignerSnapTargetsFromLayers(
  activeLayerId: string,
  layers: DesignLayer[],
  ctx: DesignerCoordinateContext,
): SnapTarget[] {
  return projectSnapTargetsToDesigner(
    buildSnapTargetsFromLayers(activeLayerId, layers),
    ctx,
  );
}

/**
 * Step 13.0I：Designer 空間拖曳吸附 → Workspace patch。
 * geometry.applyDragSnap 於 Designer 座標執行；clamp 由呼叫端 workspace fit。
 */
export function applyDesignerDragSnap(
  layer: DesignLayer,
  designerPosition: { x_cm: number; y_cm: number },
  ctx: DesignerCoordinateContext,
  options: DesignerDragSnapOptions,
): { workspacePatch: WorkspaceLayerPatch; guides: DesignerSnapGuides } {
  const designerPrintArea = getDesignerPrintableArea(ctx);
  const projection = projectLayerToDesigner(layer, ctx);
  const baseWidth = projection.width_cm / projection.scale;
  const baseHeight = projection.height_cm / projection.scale;
  const designerTargets = projectSnapTargetsToDesigner(
    options.otherElements,
    ctx,
  );

  const snap = applyDragSnap(
    designerPosition.x_cm,
    designerPosition.y_cm,
    baseWidth,
    baseHeight,
    projection.scale,
    designerPrintArea,
    {
      gridSnap: options.gridSnap,
      gridSize: getDesignerGridSizeCm(ctx),
      gridThreshold: workspaceLengthToDesignerLength(
        GRID_SNAP_THRESHOLD_CM,
        ctx,
        "x",
      ),
      elementSnap: options.elementSnap,
      elementSnapThreshold: workspaceLengthToDesignerLength(
        options.elementSnapThresholdCm,
        ctx,
        "x",
      ),
      otherElements: designerTargets,
    },
  );

  return projectDesignerSnapResultToWorkspace(snap, layer, ctx);
}

/** Step 13.0J：Gesture patch（Designer 空間輸入） */
export type DesignerGesturePatch = DesignerLayerPatch;

/** Step 13.0J：Gesture patch（Workspace 空間輸入／輸出） */
export type WorkspaceGesturePatch = WorkspaceLayerPatch;

/** 建立 Gesture Runtime context（side + size） */
export function createDesignerGestureContext(
  side: Side,
  size: string,
): DesignerCoordinateContext {
  return createControllerContext(side, size);
}

/** Workspace gesture patch → Designer gesture patch */
export function projectWorkspaceGestureToDesigner(
  patch: WorkspaceGesturePatch,
  ctx: DesignerCoordinateContext,
): DesignerGesturePatch {
  const designer: DesignerGesturePatch = {};
  if (patch.x_cm !== undefined || patch.y_cm !== undefined) {
    const projected = workspacePointToDesignerPoint(
      { x_cm: patch.x_cm ?? 0, y_cm: patch.y_cm ?? 0 },
      ctx,
    );
    if (patch.x_cm !== undefined) designer.x_cm = projected.x_cm;
    if (patch.y_cm !== undefined) designer.y_cm = projected.y_cm;
  }
  if (patch.width_cm !== undefined) {
    designer.width_cm = workspaceLengthToDesignerLength(
      patch.width_cm,
      ctx,
      "x",
    );
  }
  if (patch.height_cm !== undefined) {
    designer.height_cm = workspaceLengthToDesignerLength(
      patch.height_cm,
      ctx,
      "y",
    );
  }
  if (patch.scale !== undefined) designer.scale = patch.scale;
  if (patch.rotation !== undefined) designer.rotation = patch.rotation;
  if (patch.fontSize_cm !== undefined) {
    designer.fontSize_cm = workspaceLengthToDesignerLength(
      patch.fontSize_cm,
      ctx,
      "y",
    );
  }
  return designer;
}

/** Designer gesture patch → Workspace patch */
export function projectDesignerGestureToWorkspace(
  layer: DesignLayer,
  patch: DesignerGesturePatch,
  ctx: DesignerCoordinateContext,
): WorkspaceLayerPatch {
  return applyDesignerLayerPatch(layer, ctx, patch);
}

function mergeDesignerGesturePatch(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  patch: DesignerGesturePatch,
): DesignerGesturePatch {
  const current = projectLayerToDesigner(layer, ctx);
  return {
    x_cm: patch.x_cm ?? current.x_cm,
    y_cm: patch.y_cm ?? current.y_cm,
    width_cm: patch.width_cm ?? current.width_cm,
    height_cm: patch.height_cm ?? current.height_cm,
    scale: patch.scale ?? current.scale,
    rotation: patch.rotation ?? layer.rotation,
    fontSize_cm: patch.fontSize_cm ?? current.fontSize_cm,
  };
}

/** Gesture move（含 Designer snap）→ Workspace patch */
export function resolveDesignerGestureMoveWorkspacePatch(
  layer: DesignLayer,
  designerPatch: DesignerGesturePatch,
  ctx: DesignerCoordinateContext,
  snapOptions: DesignerDragSnapOptions,
): WorkspaceLayerPatch {
  const current = projectLayerToDesigner(layer, ctx);
  const designerX = designerPatch.x_cm ?? current.x_cm;
  const designerY = designerPatch.y_cm ?? current.y_cm;
  const { workspacePatch } = applyDesignerDragSnap(
    layer,
    { x_cm: designerX, y_cm: designerY },
    ctx,
    snapOptions,
  );
  const result: WorkspaceLayerPatch = { ...workspacePatch };
  if (designerPatch.scale !== undefined) result.scale = designerPatch.scale;
  if (designerPatch.rotation !== undefined) {
    result.rotation = designerPatch.rotation;
  }
  return result;
}

/** Gesture scale → Workspace patch */
export function resolveDesignerGestureScaleWorkspacePatch(
  layer: DesignLayer,
  designerPatch: DesignerGesturePatch,
  ctx: DesignerCoordinateContext,
): WorkspaceLayerPatch {
  return projectDesignerGestureToWorkspace(layer, designerPatch, ctx);
}

/** Gesture rotate → Workspace patch */
export function resolveDesignerGestureRotateWorkspacePatch(
  layer: DesignLayer,
  designerPatch: DesignerGesturePatch,
  ctx: DesignerCoordinateContext,
): WorkspaceLayerPatch {
  return projectDesignerGestureToWorkspace(layer, designerPatch, ctx);
}

/** 合併 Designer gesture patch → Workspace patch */
export function applyDesignerGesturePatch(
  layer: DesignLayer,
  designerPatch: DesignerGesturePatch,
  ctx: DesignerCoordinateContext,
): WorkspaceLayerPatch {
  const merged = mergeDesignerGesturePatch(layer, ctx, designerPatch);
  return projectDesignerGestureToWorkspace(layer, merged, ctx);
}

/** Gesture resize rect（Workspace 輸入）→ Workspace patch */
export function resolveDesignerGestureResizeWorkspacePatch(
  layer: DesignLayer,
  workspaceRect: LayerCmRect,
  ctx: DesignerCoordinateContext,
): WorkspaceLayerPatch {
  const designerRect = workspaceRectToDesignerRect(workspaceRect, ctx);
  return setLayerDesignerRect(layer, ctx, designerRect);
}

/** Workspace gesture → Controller → Workspace patch（供 applyClampedLayerPatch） */
export function resolveWorkspaceGestureForApplyClamped(
  layer: DesignLayer,
  input: WorkspaceGesturePatch,
  ctx: DesignerCoordinateContext,
  snapOptions?: DesignerDragSnapOptions,
): WorkspaceLayerPatch {
  const positionChanged =
    input.x_cm !== undefined || input.y_cm !== undefined;
  const scaleOnly =
    input.scale !== undefined &&
    input.x_cm === undefined &&
    input.y_cm === undefined &&
    input.rotation === undefined;

  if (positionChanged && snapOptions) {
    const designerPatch = projectWorkspaceGestureToDesigner(input, ctx);
    return resolveDesignerGestureMoveWorkspacePatch(
      layer,
      designerPatch,
      ctx,
      snapOptions,
    );
  }

  if (scaleOnly) {
    return resolveDesignerGestureScaleWorkspacePatch(
      layer,
      { scale: input.scale },
      ctx,
    );
  }

  if (
    input.rotation !== undefined &&
    !positionChanged &&
    input.scale === undefined
  ) {
    return resolveDesignerGestureRotateWorkspacePatch(
      layer,
      { rotation: input.rotation },
      ctx,
    );
  }

  const designerPatch = projectWorkspaceGestureToDesigner(input, ctx);
  return applyDesignerGesturePatch(layer, designerPatch, ctx);
}

/** Step 13.0K：Alignment Runtime context（side + size） */
export function createDesignerAlignmentContext(
  side: Side,
  size: string,
): DesignerCoordinateContext {
  return createControllerContext(side, size);
}

function layerToDesignerAlignmentSpace(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
): DesignLayer {
  const proj = projectLayerToDesigner(layer, ctx);
  if (layer.type === "text") {
    return {
      ...layer,
      x_cm: proj.x_cm,
      y_cm: proj.y_cm,
      width_cm: proj.width_cm,
      height_cm: proj.height_cm,
      scale: proj.scale,
      rotation: proj.rotation,
      fontSize_cm:
        proj.fontSize_cm !== undefined
          ? proj.fontSize_cm / proj.scale
          : layer.fontSize_cm,
    };
  }
  return {
    ...layer,
    x_cm: proj.x_cm,
    y_cm: proj.y_cm,
    width_cm: proj.width_cm / proj.scale,
    height_cm: proj.height_cm / proj.scale,
    scale: proj.scale,
    rotation: proj.rotation,
  };
}

function layerFromDesignerAlignmentSpace(
  aligned: DesignLayer,
  original: DesignLayer,
  ctx: DesignerCoordinateContext,
): DesignLayer {
  const workspacePatch = projectLayerToWorkspace(
    designerProjectionFromDesignerSpaceLayer(aligned),
    ctx,
  );
  return mergeWorkspacePatchIntoLayer(original, workspacePatch);
}

/** Workspace layers → Designer alignment 空間（storage 欄位暫存 designer cm） */
export function projectAlignmentLayersToDesigner(
  layers: DesignLayer[],
  ctx: DesignerCoordinateContext,
): DesignLayer[] {
  return layers.map((layer) => layerToDesignerAlignmentSpace(layer, ctx));
}

/** Designer alignment 結果 → Workspace storage layers */
export function projectDesignerAlignmentResultToWorkspace(
  originalLayers: DesignLayer[],
  alignedDesignerLayers: DesignLayer[],
  ctx: DesignerCoordinateContext,
): DesignLayer[] {
  const alignedById = new Map(
    alignedDesignerLayers.map((layer) => [layer.id, layer]),
  );
  return originalLayers.map((original) => {
    const aligned = alignedById.get(original.id);
    if (!aligned) return original;
    const designerBefore = layerToDesignerAlignmentSpace(original, ctx);
    if (
      Math.abs(aligned.x_cm - designerBefore.x_cm) < 1e-6 &&
      Math.abs(aligned.y_cm - designerBefore.y_cm) < 1e-6
    ) {
      return original;
    }
    return layerFromDesignerAlignmentSpace(aligned, original, ctx);
  });
}

/** Designer alignment 結果 → 各圖層 Workspace patch */
export function resolveDesignerAlignmentWorkspacePatches(
  originalLayers: DesignLayer[],
  alignedWorkspaceLayers: DesignLayer[],
): Array<{ layerId: string; patch: WorkspaceLayerPatch }> {
  const alignedById = new Map(
    alignedWorkspaceLayers.map((layer) => [layer.id, layer]),
  );
  const patches: Array<{ layerId: string; patch: WorkspaceLayerPatch }> = [];
  for (const original of originalLayers) {
    const aligned = alignedById.get(original.id);
    if (!aligned) continue;
    const patch: WorkspaceLayerPatch = {};
    let changed = false;
    if (Math.abs(aligned.x_cm - original.x_cm) > 1e-6) {
      patch.x_cm = aligned.x_cm;
      changed = true;
    }
    if (Math.abs(aligned.y_cm - original.y_cm) > 1e-6) {
      patch.y_cm = aligned.y_cm;
      changed = true;
    }
    if (
      (aligned.type === "text" ||
        aligned.type === "image" ||
        aligned.type === "shape") &&
      Math.abs(aligned.scale - original.scale) > 1e-6
    ) {
      patch.scale = aligned.scale;
      changed = true;
    }
    if (aligned.type === "text" && aligned.fontSize_cm !== original.fontSize_cm) {
      patch.fontSize_cm = aligned.fontSize_cm;
      changed = true;
    }
    if (
      (aligned.type === "image" || aligned.type === "shape") &&
      (Math.abs(aligned.width_cm - original.width_cm) > 1e-6 ||
        Math.abs(aligned.height_cm - original.height_cm) > 1e-6)
    ) {
      patch.width_cm = aligned.width_cm;
      patch.height_cm = aligned.height_cm;
      changed = true;
    }
    if (Math.abs(aligned.rotation - original.rotation) > 1e-6) {
      patch.rotation = aligned.rotation;
      changed = true;
    }
    if (changed) {
      patches.push({ layerId: original.id, patch });
    }
  }
  return patches;
}

/** 套用 Designer 空間對齊 → Workspace storage layers */
export function applyDesignerLayerAlignment(
  layers: DesignLayer[],
  selectedIds: string[],
  axis: LayerAlignmentAxis,
  ctx: DesignerCoordinateContext,
): DesignLayer[] {
  const designerLayers = projectAlignmentLayersToDesigner(layers, ctx);
  const designerPrintArea = getDesignerPrintableArea(ctx);
  const alignedDesigner = alignDesignLayers(
    designerLayers,
    selectedIds,
    axis,
    designerPrintArea,
  );
  return projectDesignerAlignmentResultToWorkspace(
    layers,
    alignedDesigner,
    ctx,
  );
}

/** Step 13.0L：Floating Controls context（side + size） */
export function createDesignerFloatingControlContext(
  side: Side,
  size: string,
): DesignerCoordinateContext {
  return createControllerContext(side, size);
}

/** 由固定 Workspace 印刷區推斷 side（供 LayerFloatingControls 無需 DesignCanvas 改動） */
export function inferSideFromWorkspacePrintArea(
  printArea: PrintAreaCmBounds,
): Side {
  const back = getDesignerWorkspacePrintAreaCm("back");
  if (
    Math.abs(printArea.width - back.width) < 1e-6 &&
    Math.abs(printArea.height - back.height) < 1e-6
  ) {
    return "back";
  }
  return "front";
}

/** Step 13.0L：Floating Toolbar 拖曳起始狀態（Designer Coordinate） */
export interface DesignerFloatingDragState {
  originDesignerX_cm: number;
  originDesignerY_cm: number;
}

export function createDesignerFloatingDragState(
  workspaceOrigin: { x_cm: number; y_cm: number },
  ctx: DesignerCoordinateContext,
): DesignerFloatingDragState {
  const designerOrigin = workspacePointToDesignerPoint(workspaceOrigin, ctx);
  return {
    originDesignerX_cm: designerOrigin.x_cm,
    originDesignerY_cm: designerOrigin.y_cm,
  };
}

/** Floating 拖曳：Designer 目標位置 → Workspace position patch */
export function resolveDesignerFloatingMoveWorkspacePatch(
  ctx: DesignerCoordinateContext,
  drag: DesignerFloatingDragState,
  designerPosition: { x_cm: number; y_cm: number },
): WorkspaceLayerPatch {
  void drag;
  const workspacePoint = designerPointToWorkspacePoint(designerPosition, ctx);
  return {
    x_cm: workspacePoint.x_cm,
    y_cm: workspacePoint.y_cm,
  };
}

/** Floating 拖曳：Designer 位移增量 → Workspace patch */
export function applyDesignerFloatingMove(
  ctx: DesignerCoordinateContext,
  drag: DesignerFloatingDragState,
  deltaDesigner: { dx_cm: number; dy_cm: number },
): WorkspaceLayerPatch {
  return resolveDesignerFloatingMoveWorkspacePatch(ctx, drag, {
    x_cm: drag.originDesignerX_cm + deltaDesigner.dx_cm,
    y_cm: drag.originDesignerY_cm + deltaDesigner.dy_cm,
  });
}

/** Floating 拖曳：Workspace patch → onMove 用的 workspace 座標 */
export function projectDesignerFloatingResultToWorkspace(
  workspaceOrigin: { x_cm: number; y_cm: number },
  patch: WorkspaceLayerPatch,
): { x_cm: number; y_cm: number } {
  return {
    x_cm: patch.x_cm ?? workspaceOrigin.x_cm,
    y_cm: patch.y_cm ?? workspaceOrigin.y_cm,
  };
}

/** Step 13.0M：Auto-Fit / Hydration context（side + size） */
export function createDesignerFitContext(
  side: Side,
  size: string,
): DesignerCoordinateContext {
  return createControllerContext(side, size);
}

/** 單一圖層 Designer fit → Workspace storage layer */
export function fitDesignerLayer(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  options?: DesignerFitOptions,
): DesignLayer {
  return fitLayerInDesignerCoordinate(layer, ctx, options);
}

/** 多圖層 Designer fit → Workspace storage layers */
export function fitDesignerLayers(
  layers: DesignLayer[],
  ctx: DesignerCoordinateContext,
  options?: DesignerFitOptions,
): DesignLayer[] {
  return resolveDesignerFitWorkspaceLayers(layers, ctx, options);
}

/** 多圖層 Designer fit → Workspace storage layers */
export function resolveDesignerFitWorkspaceLayers(
  layers: DesignLayer[],
  ctx: DesignerCoordinateContext,
  options?: DesignerFitOptions,
): DesignLayer[] {
  return layers.map((layer) => fitDesignerLayer(layer, ctx, options));
}

/** Fit 結果 → Workspace patch */
export function resolveDesignerFitWorkspacePatch(
  original: DesignLayer,
  fitted: DesignLayer,
): WorkspaceLayerPatch {
  return workspacePatchFromFitResult(original, fitted);
}

/** Draft / Template hydration：Designer fit → Workspace storage layers */
export function hydrateDesignerLayers(
  layers: DesignLayer[],
  ctx: DesignerCoordinateContext,
): DesignLayer[] {
  return fitDesignerLayers(layers, ctx);
}

/** Layer patch + Designer fit → Workspace storage layer */
export function updateDesignerLayer(
  layer: DesignLayer,
  patch: Partial<DesignLayer>,
  ctx: DesignerCoordinateContext,
  options?: DesignerFitOptions,
): DesignLayer {
  const merged = { ...layer, ...patch } as DesignLayer;
  return fitDesignerLayer(merged, ctx, options);
}
