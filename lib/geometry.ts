import {
  ELEMENT_SNAP_THRESHOLD,
  GRID_SIZE,
  GRID_SNAP_THRESHOLD,
  SNAP_THRESHOLD,
} from "./constants";
import type { PrintAreaBounds } from "./print-area";
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

export function clampPositionToPrintArea(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  rotation: number,
  printArea: PrintAreaBounds,
): { x: number; y: number } {
  const scaled = getScaledSize(width, height, scale);
  const aabb = getRotatedAabb(scaled.width, scaled.height, rotation);

  const minX = (scaled.width - aabb.width) / 2;
  const maxX = printArea.width - aabb.width - minX;
  const minY = (scaled.height - aabb.height) / 2;
  const maxY = printArea.height - aabb.height - minY;

  return {
    x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(y, minY), Math.max(minY, maxY)),
  };
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
  printArea: PrintAreaBounds,
  options: DragSnapOptions = { gridSnap: false },
): DragSnapResult {
  const scaled = getScaledSize(width, height, scale);
  const gridSize = options.gridSize ?? GRID_SIZE;
  const gridThreshold = options.gridThreshold ?? GRID_SNAP_THRESHOLD;
  const elementThreshold =
    options.elementSnapThreshold ?? ELEMENT_SNAP_THRESHOLD;

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

  if (Math.abs(centerX - areaCenterX) <= SNAP_THRESHOLD) {
    nextX = areaCenterX - scaled.width / 2;
    snappedX = true;
    printCenterSnapX = true;
    elementGuides = { ...elementGuides, vertical: [] };
  }

  if (Math.abs(centerY - areaCenterY) <= SNAP_THRESHOLD) {
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
  printArea: PrintAreaBounds,
): SnapResult {
  return applyDragSnap(x, y, width, height, scale, printArea, {
    gridSnap: false,
  });
}

export { getAutoFitPlacement as getInitialPlacement } from "./design-placement";
