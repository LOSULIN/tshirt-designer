import {
  ELEMENT_SNAP_THRESHOLD_CM,
  GRID_SIZE_CM,
  GRID_SNAP_THRESHOLD_CM,
  SNAP_THRESHOLD_CM,
} from "./constants";
import type { PrintAreaCmBounds } from "./design-cm";
import {
  applyElementAlignmentSnap,
  type ElementAlignmentGuides,
  type SnapTarget,
} from "./element-snap";

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;
  snappedY: boolean;
}

export interface DragSnapResult extends SnapResult {
  printCenterSnapX: boolean;
  printCenterSnapY: boolean;
  elementGuides: ElementAlignmentGuides;
}

export interface DragSnapOptions {
  gridSnap: boolean;
  gridSize?: number;
  gridThreshold?: number;
  elementSnap?: boolean;
  elementSnapThreshold?: number;
  otherElements?: SnapTarget[];
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function getScaledSize(width: number, height: number, scale: number) {
  return { width: width * scale, height: height * scale };
}

export function getRotatedAabb(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const rad = degToRad(rotation);
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

export const LAYER_MIN_SCALE = 0.2;
export const LAYER_MAX_SCALE = 3;

/** 旋轉後外接矩形在當前 scale 下可放入印刷區的最大倍率 */
export function getMaxLayerScale(
  width: number,
  height: number,
  rotation: number,
  printArea: PrintAreaCmBounds,
  cap = LAYER_MAX_SCALE,
): number {
  if (width <= 0 || height <= 0) return cap;

  const aabb = getRotatedAabb(width, height, rotation);
  if (aabb.width <= 0 || aabb.height <= 0) return cap;

  return Math.min(
    cap,
    printArea.width / aabb.width,
    printArea.height / aabb.height,
  );
}

export function clampLayerScale(
  scale: number,
  min = LAYER_MIN_SCALE,
  max = LAYER_MAX_SCALE,
): number {
  return Math.min(Math.max(scale, min), max);
}

export function clampPositionToPrintArea(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  rotation: number,
  printArea: PrintAreaCmBounds,
): { x: number; y: number } {
  const scaled = getScaledSize(width, height, scale);
  const aabb = getRotatedAabb(scaled.width, scaled.height, rotation);

  // 視覺 AABB：left = x + w/2 - aabbW/2，bottom = y + h/2 + aabbH/2
  const minX = (aabb.width - scaled.width) / 2;
  const maxX = printArea.width - aabb.width / 2 - scaled.width / 2;
  const minY = (aabb.height - scaled.height) / 2;
  const maxY = printArea.height - aabb.height / 2 - scaled.height / 2;

  if (maxX < minX) {
    return {
      x: printArea.width / 2 - scaled.width / 2,
      y:
        maxY < minY
          ? printArea.height / 2 - scaled.height / 2
          : Math.min(Math.max(y, minY), maxY),
    };
  }

  if (maxY < minY) {
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: printArea.height / 2 - scaled.height / 2,
    };
  }

  return {
    x: Math.min(Math.max(x, minX), maxX),
    y: Math.min(Math.max(y, minY), maxY),
  };
}

/** 將圖層位置限制在可印刷區內（含旋轉後外接矩形）；不縮放尺寸。 */
export function fitLayerTransform(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  rotation: number,
  printArea: PrintAreaCmBounds,
  options?: { minScale?: number; maxScale?: number },
): { x: number; y: number; scale: number } {
  const clampedScale = clampLayerScale(
    scale,
    options?.minScale ?? LAYER_MIN_SCALE,
    options?.maxScale ?? LAYER_MAX_SCALE,
  );
  const clamped = clampPositionToPrintArea(
    x,
    y,
    width,
    height,
    clampedScale,
    rotation,
    printArea,
  );

  return { x: clamped.x, y: clamped.y, scale: clampedScale };
}

function snapAxisToGrid(
  value: number,
  gridSize: number,
  threshold: number,
): { value: number; snapped: boolean } {
  const gridLine = Math.round(value / gridSize) * gridSize;
  if (Math.abs(value - gridLine) <= threshold) {
    return { value: gridLine, snapped: true };
  }
  return { value, snapped: false };
}

/** 拖曳吸附：格線 → 元素對齊 → 印刷區中心（中心優先，避免抖動） */
export function applyDragSnap(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  printArea: PrintAreaCmBounds,
  options: DragSnapOptions = { gridSnap: false },
): DragSnapResult {
  const scaled = getScaledSize(width, height, scale);
  const gridSize = options.gridSize ?? GRID_SIZE_CM;
  const gridThreshold = options.gridThreshold ?? GRID_SNAP_THRESHOLD_CM;
  const elementThreshold =
    options.elementSnapThreshold ?? ELEMENT_SNAP_THRESHOLD_CM;

  let nextX = x;
  let nextY = y;
  let snappedX = false;
  let snappedY = false;
  let printCenterSnapX = false;
  let printCenterSnapY = false;
  let elementGuides: ElementAlignmentGuides = {
    vertical: [],
    horizontal: [],
  };

  if (options.gridSnap) {
    const sx = snapAxisToGrid(nextX, gridSize, gridThreshold);
    const sy = snapAxisToGrid(nextY, gridSize, gridThreshold);
    nextX = sx.value;
    nextY = sy.value;
    snappedX = sx.snapped;
    snappedY = sy.snapped;
  }

  if (
    options.elementSnap !== false &&
    options.otherElements &&
    options.otherElements.length > 0
  ) {
    const el = applyElementAlignmentSnap(
      nextX,
      nextY,
      width,
      height,
      scale,
      options.otherElements,
      elementThreshold,
    );
    nextX = el.x;
    nextY = el.y;
    if (el.snappedX) snappedX = true;
    if (el.snappedY) snappedY = true;
    elementGuides = el.guides;
  }

  const centerX = nextX + scaled.width / 2;
  const centerY = nextY + scaled.height / 2;
  const areaCenterX = printArea.width / 2;
  const areaCenterY = printArea.height / 2;

  if (Math.abs(centerX - areaCenterX) <= SNAP_THRESHOLD_CM) {
    nextX = areaCenterX - scaled.width / 2;
    snappedX = true;
    printCenterSnapX = true;
    elementGuides = { ...elementGuides, vertical: [] };
  }

  if (Math.abs(centerY - areaCenterY) <= SNAP_THRESHOLD_CM) {
    nextY = areaCenterY - scaled.height / 2;
    snappedY = true;
    printCenterSnapY = true;
    elementGuides = { ...elementGuides, horizontal: [] };
  }

  return {
    x: nextX,
    y: nextY,
    snappedX,
    snappedY,
    printCenterSnapX,
    printCenterSnapY,
    elementGuides,
  };
}

/** @deprecated 使用 applyDragSnap */
export function applySnapGuides(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  printArea: PrintAreaCmBounds,
): SnapResult {
  return applyDragSnap(x, y, width, height, scale, printArea, {
    gridSnap: false,
  });
}

export { getAutoFitPlacement as getInitialPlacement } from "./design-placement";
