/**
 * Mockup Visual Compensation — product mockup display only.
 * Does not affect placement, calibration, factory artwork, or print export.
 */

import type { CalibrationRect } from "./render-types";

export const DEFAULT_MOCKUP_VISUAL_SCALE = 1;

export interface MockupVisualCompensation {
  version: number;
  mockupVisualScale: number;
}

export const DEFAULT_MOCKUP_VISUAL_COMPENSATION: MockupVisualCompensation = {
  version: 1,
  mockupVisualScale: DEFAULT_MOCKUP_VISUAL_SCALE,
};

export function parseMockupVisualCompensation(
  raw: unknown,
): MockupVisualCompensation {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_MOCKUP_VISUAL_COMPENSATION };
  }

  const record = raw as Record<string, unknown>;
  const version =
    typeof record.version === "number" && Number.isFinite(record.version)
      ? record.version
      : 1;
  const scale = record.mockupVisualScale;

  if (typeof scale === "number" && Number.isFinite(scale) && scale > 0) {
    return { version, mockupVisualScale: scale };
  }

  return { ...DEFAULT_MOCKUP_VISUAL_COMPENSATION };
}

/**
 * Scale artwork draw rect around placement center (placement definition unchanged).
 */
export function applyMockupVisualCompensation(
  rect: CalibrationRect,
  mockupVisualScale: number,
): CalibrationRect {
  const scale =
    Number.isFinite(mockupVisualScale) && mockupVisualScale > 0
      ? mockupVisualScale
      : DEFAULT_MOCKUP_VISUAL_SCALE;

  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const destWidth = rect.width * scale;
  const destHeight = rect.height * scale;
  const destX = cx - destWidth / 2;
  const destY = cy - destHeight / 2;

  return {
    x: destX,
    y: destY,
    width: destWidth,
    height: destHeight,
  };
}

export interface MockupVisualCompensationCenterCheck {
  pass: boolean;
  centerDiffPx: number;
  sourceCenter: { x: number; y: number };
  destCenter: { x: number; y: number };
}

export function verifyMockupVisualCompensationCenterAnchor(
  rect: CalibrationRect,
  mockupVisualScale: number,
  tolerancePx = 0.5,
): MockupVisualCompensationCenterCheck {
  const dest = applyMockupVisualCompensation(rect, mockupVisualScale);
  const sourceCenter = {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
  const destCenter = {
    x: dest.x + dest.width / 2,
    y: dest.y + dest.height / 2,
  };
  const centerDiffPx = Math.hypot(
    destCenter.x - sourceCenter.x,
    destCenter.y - sourceCenter.y,
  );

  return {
    pass: centerDiffPx < tolerancePx,
    centerDiffPx,
    sourceCenter,
    destCenter,
  };
}
