import {
  createCalibrationSideMapping,
  isCalibrationSideMapping,
  resolveCalibrationReferences,
} from "./coordinate-mapping";
import { fetchProductCalibrationFile } from "@/lib/products/product-loader";
import { getDefaultDesignerPrintAreaRect } from "./designer-template-reference";
import { normalizeFineCalibrationMapping, parseFineCalibrationMapping } from "./fine-calibration";
import {
  normalizeVisualAdjustment,
  parseVisualAdjustment,
} from "./visual-adjustment";
import type {
  CalibrationRect,
  CalibrationSideMapping,
  CalibrationSideValue,
  FineCalibrationMapping,
  ProductCalibration,
  ProductSide,
  VisualAdjustment,
} from "./render-types";

export function isCalibrationRectActive(rect: CalibrationRect | undefined): boolean {
  if (!rect) return false;
  return rect.width > 0 && rect.height > 0;
}

function parseRect(value: unknown): CalibrationRect | undefined {
  if (!value || typeof value !== "object") return undefined;
  const r = value as Record<string, unknown>;
  return {
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    width: Number(r.width ?? 0),
    height: Number(r.height ?? 0),
  };
}

function parseSideMapping(value: unknown): CalibrationSideMapping | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const designerReference = record.designerReference;
  const productReference = record.productReference;
  if (!designerReference || typeof designerReference !== "object") return undefined;
  if (!productReference || typeof productReference !== "object") return undefined;
  const designerPrintArea = parseRect(
    (designerReference as Record<string, unknown>).printArea,
  );
  const productPrintArea = parseRect(
    (productReference as Record<string, unknown>).printArea,
  );
  if (!designerPrintArea || !productPrintArea) return undefined;
  const mapping = parseFineCalibrationMapping(record.mapping);
  const visualAdjustment = parseVisualAdjustment(record.visualAdjustment);
  return {
    designerReference: { printArea: designerPrintArea },
    productReference: { printArea: productPrintArea },
    ...(mapping ? { mapping: normalizeFineCalibrationMapping(mapping) } : {}),
    ...(visualAdjustment
      ? { visualAdjustment: normalizeVisualAdjustment(visualAdjustment) }
      : {}),
  };
}

function parseSideValue(value: unknown): CalibrationSideValue | undefined {
  const mapping = parseSideMapping(value);
  if (mapping) return mapping;
  return parseRect(value);
}

/** Product print area rect (legacy flat or v2 productReference). */
export function getProductPrintAreaForSide(
  calibration: ProductCalibration,
  side: ProductSide,
): CalibrationRect | undefined {
  return resolveCalibrationReferences(calibration, side)?.product;
}

/** Designer template print area rect (v2 designerReference or default template baseline). */
export function getDesignerPrintAreaForSide(
  calibration: ProductCalibration,
  side: ProductSide,
): CalibrationRect {
  return (
    resolveCalibrationReferences(calibration, side)?.designer ??
    getDefaultDesignerPrintAreaRect(side)
  );
}

/** @deprecated Use getProductPrintAreaForSide — kept for render validation compatibility. */
export function getCalibrationRectForSide(
  calibration: ProductCalibration,
  side: ProductSide,
): CalibrationRect | undefined {
  return getProductPrintAreaForSide(calibration, side);
}

export async function fetchProductCalibration(
  productCode: string,
): Promise<ProductCalibration> {
  return fetchProductCalibrationFile(productCode);
}

export function parseProductCalibration(json: unknown): ProductCalibration {
  if (!json || typeof json !== "object") {
    return {};
  }
  const record = json as Record<string, unknown>;
  return {
    front: parseSideValue(record.front),
    back: parseSideValue(record.back),
  };
}

export function serializeProductCalibration(
  calibration: ProductCalibration,
): string {
  const normalizeSide = (
    value: CalibrationSideValue | undefined,
    side: ProductSide,
  ): CalibrationSideMapping | undefined => {
    if (!value) return undefined;
    if (isCalibrationSideMapping(value)) {
      return {
        ...value,
        mapping: value.mapping
          ? normalizeFineCalibrationMapping(value.mapping)
          : undefined,
        visualAdjustment: value.visualAdjustment
          ? normalizeVisualAdjustment(value.visualAdjustment)
          : undefined,
      };
    }
    if (isCalibrationRectActive(value)) {
      return createCalibrationSideMapping(side, value);
    }
    return undefined;
  };

  const payload: Record<string, CalibrationSideMapping> = {};
  const front = normalizeSide(calibration.front, "front");
  const back = normalizeSide(calibration.back, "back");
  if (front) payload.front = front;
  if (back) payload.back = back;
  return JSON.stringify(payload, null, 2);
}

export function getEditableProductRectForSide(
  calibration: ProductCalibration,
  side: ProductSide,
): CalibrationRect | undefined {
  const sideData = side === "front" ? calibration.front : calibration.back;
  if (!sideData) return undefined;
  if (isCalibrationSideMapping(sideData)) {
    return sideData.productReference.printArea;
  }
  return sideData;
}

export function getEditableFineMappingForSide(
  calibration: ProductCalibration,
  side: ProductSide,
): FineCalibrationMapping | undefined {
  const sideData = side === "front" ? calibration.front : calibration.back;
  if (isCalibrationSideMapping(sideData)) {
    return sideData.mapping;
  }
  return undefined;
}

export function getEditableVisualAdjustmentForSide(
  calibration: ProductCalibration,
  side: ProductSide,
): VisualAdjustment | undefined {
  const sideData = side === "front" ? calibration.front : calibration.back;
  if (isCalibrationSideMapping(sideData)) {
    return sideData.visualAdjustment;
  }
  return undefined;
}
