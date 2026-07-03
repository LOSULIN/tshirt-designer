/**
 * Garment Constraint UX Polish — Step 12.9D（純呈現層；不修改 Runtime / Mapping）
 */

import type { PrintAreaCmBounds } from "./design-cm";
import type { GarmentConstraintEdge, GarmentViolationState } from "./garment-constraint-ux";
import { formatGarmentPrintAreaCmPair } from "./garment-constraint-ux";

export type GarmentConstraintWarningLevel = "ok" | "caution" | "violation";

export interface GarmentPrintStatus {
  level: GarmentConstraintWarningLevel;
  label: string;
  detail: string;
}

export interface GarmentConstraintBadgeMeta {
  level: GarmentConstraintWarningLevel;
  shortLabel: string;
  tooltip: string;
}

const EDGE_LABEL_ZH: Record<GarmentConstraintEdge, string> = {
  left: "左",
  right: "右",
  top: "上",
  bottom: "下",
};

export function resolveLayerConstraintWarningLevel(
  violation: GarmentViolationState,
): GarmentConstraintWarningLevel {
  if (!violation.exceedsGarmentPrintArea) {
    return "ok";
  }
  return violation.violationEdges.length >= 2 ? "violation" : "caution";
}

export function resolveInspectorWarningLevel(
  exceedsPrintArea: boolean,
  exceedsSafeZone: boolean,
): GarmentConstraintWarningLevel {
  if (exceedsPrintArea) {
    return "violation";
  }
  if (exceedsSafeZone) {
    return "caution";
  }
  return "ok";
}

export function getConstraintOverlayDescription(
  size: string,
  garmentPrintArea: PrintAreaCmBounds,
  workspacePrintArea: PrintAreaCmBounds,
): string {
  const garment = formatGarmentPrintAreaCmPair(garmentPrintArea);
  const workspace = formatGarmentPrintAreaCmPair(workspacePrintArea);
  const widthPct = ((garmentPrintArea.width / workspacePrintArea.width) * 100).toFixed(
    0,
  );
  const heightPct = (
    (garmentPrintArea.height / workspacePrintArea.height) *
    100
  ).toFixed(0);
  return `尺碼 ${size} 可印範圍 ${garment}。設計工作區為 ${workspace}；紫框約佔工作區 ${widthPct}%×${heightPct}%。圖層會依尺碼映射後判定是否超出可印範圍。`;
}

export function getGarmentPrintStatus(
  violationCount: number,
  size: string,
  garmentPrintArea: PrintAreaCmBounds,
): GarmentPrintStatus {
  const garment = formatGarmentPrintAreaCmPair(garmentPrintArea);
  if (violationCount <= 0) {
    return {
      level: "ok",
      label: "可印就緒",
      detail: `尺碼 ${size} · 可印 ${garment} · 所有圖層均在可印範圍內`,
    };
  }
  return {
    level: violationCount >= 2 ? "violation" : "caution",
    label: `${violationCount} 個圖層需調整`,
    detail: `${violationCount} 個圖層超出尺碼 ${size} 可印範圍（${garment}）`,
  };
}

export function getLayerConstraintBadgeMeta(
  violation: GarmentViolationState,
  layerName: string,
): GarmentConstraintBadgeMeta {
  const level = resolveLayerConstraintWarningLevel(violation);
  if (level === "ok") {
    return {
      level,
      shortLabel: "OK",
      tooltip: `${layerName}：在目前尺碼可印範圍內`,
    };
  }
  const edges =
    violation.violationEdges.length > 0
      ? violation.violationEdges.map((e) => EDGE_LABEL_ZH[e]).join("、")
      : null;
  const edgeHint = edges ? `（超出${edges}側）` : "";
  return {
    level,
    shortLabel: "Exceeds printable area",
    tooltip: `${layerName}: exceeds printable area${edgeHint}`,
  };
}

export function getInspectorConstraintBadgeMeta(
  exceedsPrintArea: boolean,
  exceedsSafeZone: boolean,
  layerName: string,
  warnings: string[],
): GarmentConstraintBadgeMeta {
  const level = resolveInspectorWarningLevel(exceedsPrintArea, exceedsSafeZone);
  if (level === "ok") {
    return {
      level,
      shortLabel: "OK",
      tooltip: `${layerName}：印刷狀態正常`,
    };
  }
  const primary = warnings[0] ?? (exceedsPrintArea ? "超出可印範圍" : "超出安全區域");
  return {
    level,
    shortLabel: exceedsPrintArea ? "超出" : "注意",
    tooltip: `${layerName}：${primary}`,
  };
}

export const GARMENT_CONSTRAINT_LEVEL_STYLES: Record<
  GarmentConstraintWarningLevel,
  { badge: string; text: string; ring: string }
> = {
  ok: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    text: "text-emerald-700",
    ring: "ring-emerald-300",
  },
  caution: {
    badge: "bg-amber-100 text-amber-900 border-amber-200",
    text: "text-amber-800",
    ring: "ring-amber-400",
  },
  violation: {
    badge: "bg-red-100 text-red-800 border-red-200",
    text: "text-red-700",
    ring: "ring-red-400",
  },
};
