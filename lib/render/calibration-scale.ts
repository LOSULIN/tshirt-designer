import { isCalibrationSideMapping } from "./coordinate-mapping";
import type {
  CalibrationRect,
  CalibrationSideMapping,
  ProductCalibration,
  ProductSide,
} from "./render-types";

function scaleRect(rect: CalibrationRect, scale: number): CalibrationRect {
  if (scale === 1) return { ...rect };
  return {
    x: Math.round(rect.x * scale),
    y: Math.round(rect.y * scale),
    width: Math.round(rect.width * scale),
    height: Math.round(rect.height * scale),
  };
}

function scaleSideMapping(
  mapping: CalibrationSideMapping,
  scale: number,
): CalibrationSideMapping {
  if (scale === 1) return { ...mapping };

  const designerReference = {
    printArea: scaleRect(mapping.designerReference.printArea, scale),
  };
  const productReference = {
    printArea: scaleRect(mapping.productReference.printArea, scale),
  };

  const fine = mapping.mapping
    ? {
        offsetX: Math.round(mapping.mapping.offsetX * scale),
        offsetY: Math.round(mapping.mapping.offsetY * scale),
        scaleX: mapping.mapping.scaleX,
        scaleY: mapping.mapping.scaleY,
      }
    : undefined;

  const visualAdjustment = mapping.visualAdjustment
    ? {
        offsetX: Math.round(mapping.visualAdjustment.offsetX * scale),
        offsetY: Math.round(mapping.visualAdjustment.offsetY * scale),
      }
    : undefined;

  return {
    designerReference,
    productReference,
    ...(fine ? { mapping: fine } : {}),
    ...(visualAdjustment ? { visualAdjustment } : {}),
  };
}

/** Scale calibration pixel rects when export garment asset is larger than reference. */
export function scaleProductCalibration(
  calibration: ProductCalibration,
  scale: number,
): ProductCalibration {
  if (scale === 1) return calibration;

  const next: ProductCalibration = { ...calibration };

  if (calibration.front) {
    next.front = isCalibrationSideMapping(calibration.front)
      ? scaleSideMapping(calibration.front, scale)
      : scaleRect(calibration.front, scale);
  }

  if (calibration.back) {
    next.back = isCalibrationSideMapping(calibration.back)
      ? scaleSideMapping(calibration.back, scale)
      : scaleRect(calibration.back, scale);
  }

  return next;
}

export function resolveCalibrationScaleFromAssetSize(
  naturalWidth: number,
  naturalHeight: number,
  referenceWidth?: number,
  referenceHeight?: number,
): number {
  if (!referenceWidth || referenceWidth <= 0) return 1;
  const widthScale = naturalWidth / referenceWidth;
  if (!Number.isFinite(widthScale) || widthScale <= 0) return 1;

  if (referenceHeight && referenceHeight > 0) {
    const heightScale = naturalHeight / referenceHeight;
    if (Number.isFinite(heightScale) && heightScale > 0) {
      return (widthScale + heightScale) / 2;
    }
  }

  return widthScale;
}

export function resolveCalibrationScaleForSide(
  calibration: ProductCalibration,
  side: ProductSide,
  scale: number,
): ProductCalibration {
  return scaleProductCalibration(calibration, scale);
}
