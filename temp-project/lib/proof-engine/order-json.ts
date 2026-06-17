/**
 * order.json — 訂單／生產規格摘要（Storage + ZIP）。
 * 新欄位在型別上為 optional，以便讀取舊版檔案。
 */

import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../design-state";
import {
  getPrintExportDimensionsPx,
  getPrintExportSpec,
} from "../print-export-system";
import { resolveMaterialLabelFromDesignMeta } from "../constants";
import type { ProofOrder } from "./types";
import type { ValidationReport } from "./validation-report";

export const ORDER_JSON_FILENAME = "order.json";

export type OrderPrintMethod = "DTF" | "DTG";

export interface OrderJsonDocument {
  order_id: string;
  submission_no: string;
  version: number;
  created_at: string;
  gender: ProofOrder["gender"];
  size: ProofOrder["size"];
  shirt_color: ProofOrder["shirt_color"];
  active_side: ProofOrder["active_side"];
  material?: string;
  printMethod?: OrderPrintMethod;
  dpi?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  colorMode?: "RGB";
  background?: string;
  validationStatus?: ValidationReport["status"];
}

export function resolveOrderPrintMethod(order: ProofOrder): OrderPrintMethod {
  const raw = order.design_meta?.printMethod;
  if (raw === "DTF" || raw === "DTG") {
    return raw;
  }

  for (const side of DESIGN_SIDES) {
    if (!hasDesignInSlot(order.layers_by_template, order.gender, side)) {
      continue;
    }
    const layers = getLayersForSlot(
      order.layers_by_template,
      order.gender,
      side,
    );
    if (layers.some((layer) => layer.visible && layer.type === "image")) {
      return "DTF";
    }
  }

  return "DTG";
}

export function buildOrderJson(
  order: ProofOrder,
  version: number,
  validationReport: ValidationReport,
): OrderJsonDocument {
  const spec = getPrintExportSpec(order.active_side);
  const { widthPx, heightPx } = getPrintExportDimensionsPx(order.active_side);

  return {
    order_id: order.order_id,
    submission_no: order.submission_no ?? "",
    version,
    created_at: order.created_at ?? validationReport.timestamp,
    gender: order.gender,
    size: order.size,
    shirt_color: order.shirt_color,
    active_side: order.active_side,
    material: resolveMaterialLabelFromDesignMeta(order.design_meta),
    printMethod: resolveOrderPrintMethod(order),
    dpi: spec.dpi,
    pixelWidth: widthPx,
    pixelHeight: heightPx,
    colorMode: "RGB",
    background: spec.background,
    validationStatus: validationReport.status,
  };
}

export function serializeOrderJson(document: OrderJsonDocument): string {
  return JSON.stringify(document, null, 2);
}
