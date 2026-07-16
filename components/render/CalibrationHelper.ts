import {
  fetchProductCalibration,
  parseProductCalibration,
  serializeProductCalibration,
} from "@/lib/render/calibration";
import { mergeCalibrationSide } from "@/lib/render/calibration-rect";
import { mergeFineCalibrationSide } from "@/lib/render/fine-calibration";
import { mergeVisualAdjustmentSide } from "@/lib/render/visual-adjustment";
import type {
  CalibrationRect,
  FineCalibrationMapping,
  ProductCalibration,
  ProductSide,
  VisualAdjustment,
} from "@/lib/render/render-types";
import { getProductCalibrationUrl } from "@/lib/products/product-registry";

export interface CalibrationPreview {
  productCode: string;
  calibration: ProductCalibration;
  calibrationUrl: string;
}

export function downloadCalibrationJson(
  productCode: string,
  calibration: ProductCalibration,
): void {
  const json = serializeProductCalibration(calibration);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${productCode}-calibration.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function saveCalibrationToFile(
  productCode: string,
  calibration: ProductCalibration,
): Promise<void> {
  const response = await fetch(`/api/products/${productCode}/calibration`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(calibration),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? `Save failed (${response.status})`);
  }
}

export function saveVisualAdjustmentDraft(
  productCode: string,
  baseCalibration: ProductCalibration,
  side: ProductSide,
  visual: VisualAdjustment,
  options?: { download?: boolean },
): ProductCalibration {
  const merged = mergeVisualAdjustmentSide(baseCalibration, side, visual);
  const json = serializeProductCalibration(merged);
  console.log(`[Calibration] ${productCode} (${side}) visualAdjustment`, visual);
  console.log(json);
  if (options?.download !== false) {
    downloadCalibrationJson(productCode, merged);
  }
  return merged;
}

export function saveCalibrationDraft(
  productCode: string,
  baseCalibration: ProductCalibration,
  side: ProductSide,
  rect: CalibrationRect,
  fine?: FineCalibrationMapping,
  visual?: VisualAdjustment,
  options?: { download?: boolean; persist?: boolean },
): ProductCalibration {
  let merged = mergeCalibrationSide(baseCalibration, side, rect);
  if (fine) {
    merged = mergeFineCalibrationSide(merged, side, fine);
  }
  if (visual) {
    merged = mergeVisualAdjustmentSide(merged, side, visual);
  }
  const json = serializeProductCalibration(merged);
  console.log(`[Calibration] ${productCode} (${side})`, merged);
  console.log(json);
  if (options?.download !== false) {
    downloadCalibrationJson(productCode, merged);
  }
  return merged;
}

/**
 * Calibration helper — read / preview / download product calibration.
 */
export const CalibrationHelper = {
  async read(productCode: string): Promise<ProductCalibration> {
    return fetchProductCalibration(productCode);
  },

  parse(json: unknown): ProductCalibration {
    return parseProductCalibration(json);
  },

  serialize(calibration: ProductCalibration): string {
    return serializeProductCalibration(calibration);
  },

  async preview(productCode: string): Promise<CalibrationPreview> {
    const calibration = await fetchProductCalibration(productCode);
    return {
      productCode,
      calibration,
      calibrationUrl: getProductCalibrationUrl(productCode),
    };
  },

  mergeSide(
    calibration: ProductCalibration,
    side: ProductSide,
    rect: CalibrationRect,
  ): ProductCalibration {
    return mergeCalibrationSide(calibration, side, rect);
  },

  mergeFine(
    calibration: ProductCalibration,
    side: ProductSide,
    fine: FineCalibrationMapping,
  ): ProductCalibration {
    return mergeFineCalibrationSide(calibration, side, fine);
  },

  mergeVisual(
    calibration: ProductCalibration,
    side: ProductSide,
    visual: VisualAdjustment,
  ): ProductCalibration {
    return mergeVisualAdjustmentSide(calibration, side, visual);
  },

  saveVisualOnly(
    productCode: string,
    baseCalibration: ProductCalibration,
    side: ProductSide,
    visual: VisualAdjustment,
    options?: { download?: boolean },
  ): ProductCalibration {
    return saveVisualAdjustmentDraft(productCode, baseCalibration, side, visual, options);
  },

  download(productCode: string, calibration: ProductCalibration): void {
    downloadCalibrationJson(productCode, calibration);
  },

  saveDraft(
    productCode: string,
    baseCalibration: ProductCalibration,
    side: ProductSide,
    rect: CalibrationRect,
    fine?: FineCalibrationMapping,
    visual?: VisualAdjustment,
    options?: { download?: boolean; persist?: boolean },
  ): ProductCalibration {
    return saveCalibrationDraft(productCode, baseCalibration, side, rect, fine, visual, options);
  },

  async persist(
    productCode: string,
    calibration: ProductCalibration,
  ): Promise<void> {
    await saveCalibrationToFile(productCode, calibration);
  },
};
