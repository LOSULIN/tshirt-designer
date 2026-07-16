import { createCalibrationSideMapping, isCalibrationSideMapping } from "./coordinate-mapping";
import type { CalibrationRect, CalibrationSideMapping, ProductCalibration, ProductSide } from "./render-types";

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface ImageBounds {
  width: number;
  height: number;
}

const MIN_RECT_SIZE = 16;

export function clampCalibrationRect(
  rect: CalibrationRect,
  bounds: ImageBounds,
  minSize = MIN_RECT_SIZE,
): CalibrationRect {
  let width = Math.max(minSize, rect.width);
  let height = Math.max(minSize, rect.height);
  width = Math.min(width, bounds.width);
  height = Math.min(height, bounds.height);

  let x = rect.x;
  let y = rect.y;
  x = Math.max(0, Math.min(x, bounds.width - width));
  y = Math.max(0, Math.min(y, bounds.height - height));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Starting rect when calibration.json has zero-sized values. */
export function createDefaultCalibrationRect(bounds: ImageBounds): CalibrationRect {
  const width = Math.round(bounds.width * 0.35);
  const height = Math.round(bounds.height * 0.42);
  const x = Math.round((bounds.width - width) / 2);
  const y = Math.round(bounds.height * 0.2);
  return clampCalibrationRect({ x, y, width, height }, bounds);
}

export function resolveEditableCalibrationRect(
  rect: CalibrationRect | undefined,
  bounds: ImageBounds,
): CalibrationRect {
  if (rect && rect.width > 0 && rect.height > 0) {
    return clampCalibrationRect(rect, bounds);
  }
  return createDefaultCalibrationRect(bounds);
}

export function moveCalibrationRect(
  start: CalibrationRect,
  deltaX: number,
  deltaY: number,
  bounds: ImageBounds,
): CalibrationRect {
  return clampCalibrationRect(
    {
      x: start.x + deltaX,
      y: start.y + deltaY,
      width: start.width,
      height: start.height,
    },
    bounds,
  );
}

export function resizeCalibrationRect(
  start: CalibrationRect,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  bounds: ImageBounds,
): CalibrationRect {
  let { x, y, width, height } = start;

  if (handle.includes("e")) width += deltaX;
  if (handle.includes("w")) {
    x += deltaX;
    width -= deltaX;
  }
  if (handle.includes("s")) height += deltaY;
  if (handle.includes("n")) {
    y += deltaY;
    height -= deltaY;
  }

  return clampCalibrationRect({ x, y, width, height }, bounds);
}

export function mergeCalibrationSide(
  calibration: ProductCalibration,
  side: ProductSide,
  rect: CalibrationRect,
): ProductCalibration {
  const sideData = side === "front" ? calibration.front : calibration.back;
  const designerRect = isCalibrationSideMapping(sideData)
    ? sideData.designerReference.printArea
    : undefined;
  const sideMapping: CalibrationSideMapping = {
    ...createCalibrationSideMapping(side, rect, designerRect),
    ...(isCalibrationSideMapping(sideData) && sideData.mapping
      ? { mapping: sideData.mapping }
      : {}),
  };
  if (side === "front") {
    return { ...calibration, front: sideMapping };
  }
  return { ...calibration, back: sideMapping };
}

export function formatCalibrationRect(rect: CalibrationRect): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}
