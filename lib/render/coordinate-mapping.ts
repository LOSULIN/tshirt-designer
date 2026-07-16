/**
 * Coordinate Mapping — Designer Print Area → Product Print Area.
 * Render Engine placement; independent from Designer coordinate runtime.
 */

import { isCalibrationRectActive } from "./calibration";
import { getDefaultDesignerPrintAreaRect } from "./designer-template-reference";
import type {
  CalibrationRect,
  CalibrationSideMapping,
  ProductCalibration,
  ProductSide,
} from "./render-types";

export interface CoordinateMappingTransform {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  designerPrintArea: CalibrationRect;
  productPrintArea: CalibrationRect;
}

export interface MappedArtworkPlacement {
  placement: CalibrationRect;
  mapping: CoordinateMappingTransform;
}

export function isCalibrationSideMapping(
  value: unknown,
): value is CalibrationSideMapping {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const designer = record.designerReference;
  const product = record.productReference;
  if (!designer || typeof designer !== "object") return false;
  if (!product || typeof product !== "object") return false;
  const designerArea = (designer as Record<string, unknown>).printArea;
  const productArea = (product as Record<string, unknown>).printArea;
  return (
    !!designerArea &&
    typeof designerArea === "object" &&
    !!productArea &&
    typeof productArea === "object"
  );
}

function parseRect(value: unknown): CalibrationRect | undefined {
  if (!value || typeof value !== "object") return undefined;
  const rect = value as Record<string, unknown>;
  return {
    x: Number(rect.x ?? 0),
    y: Number(rect.y ?? 0),
    width: Number(rect.width ?? 0),
    height: Number(rect.height ?? 0),
  };
}

export function resolveCalibrationReferences(
  calibration: ProductCalibration,
  side: ProductSide,
): { designer: CalibrationRect; product: CalibrationRect } | null {
  const sideData = side === "front" ? calibration.front : calibration.back;
  if (!sideData) return null;

  if (isCalibrationSideMapping(sideData)) {
    const designer =
      parseRect(sideData.designerReference.printArea) ??
      getDefaultDesignerPrintAreaRect(side);
    const product = parseRect(sideData.productReference.printArea);
    if (!product || !isCalibrationRectActive(product)) return null;
    return {
      designer: isCalibrationRectActive(designer)
        ? designer
        : getDefaultDesignerPrintAreaRect(side),
      product,
    };
  }

  const legacy = sideData as CalibrationRect;
  if (!isCalibrationRectActive(legacy)) return null;
  return {
    designer: getDefaultDesignerPrintAreaRect(side),
    product: legacy,
  };
}

export function computeCoordinateMapping(
  designerPrintArea: CalibrationRect,
  productPrintArea: CalibrationRect,
): CoordinateMappingTransform {
  return {
    scaleX: productPrintArea.width / designerPrintArea.width,
    scaleY: productPrintArea.height / designerPrintArea.height,
    offsetX: productPrintArea.x,
    offsetY: productPrintArea.y,
    designerPrintArea,
    productPrintArea,
  };
}

export function mapDesignerPointToProduct(
  designerX: number,
  designerY: number,
  mapping: CoordinateMappingTransform,
): { x: number; y: number } {
  return {
    x: mapping.offsetX + designerX * mapping.scaleX,
    y: mapping.offsetY + designerY * mapping.scaleY,
  };
}

/** Map a rect in designer print-area space (origin = top-left of designer print area). */
export function mapDesignerRectToProduct(
  designerRect: CalibrationRect,
  mapping: CoordinateMappingTransform,
): CalibrationRect {
  const origin = mapDesignerPointToProduct(designerRect.x, designerRect.y, mapping);
  return {
    x: Math.round(origin.x),
    y: Math.round(origin.y),
    width: Math.round(designerRect.width * mapping.scaleX),
    height: Math.round(designerRect.height * mapping.scaleY),
  };
}

/**
 * Resolve product placement for full-bleed artwork exported from Designer Print Area.
 * Scale / offset derive from designer → product print area mapping.
 */
export function resolveMappedArtworkPlacement(
  calibration: ProductCalibration,
  side: ProductSide,
): MappedArtworkPlacement | null {
  const refs = resolveCalibrationReferences(calibration, side);
  if (!refs) return null;

  const mapping = computeCoordinateMapping(refs.designer, refs.product);
  return {
    placement: refs.product,
    mapping,
  };
}

export function createCalibrationSideMapping(
  side: ProductSide,
  productRect: CalibrationRect,
  designerRect?: CalibrationRect,
): CalibrationSideMapping {
  return {
    designerReference: {
      printArea: designerRect ?? getDefaultDesignerPrintAreaRect(side),
    },
    productReference: {
      printArea: productRect,
    },
  };
}
