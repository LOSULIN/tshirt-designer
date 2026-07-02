/**
 * Garment Print Constraint UX — Step 12.9C
 * 文案、Overlay 比例、Inspector 警告（僅 UI 衍生；不修改 layer 或 workspace）。
 */

import type { PrintAreaCmBounds } from "./design-cm";
import type { LayerOverflowEdge, LayerOverflowState } from "./layer-overflow";

export type GarmentConstraintEdge = LayerOverflowEdge;

export interface GarmentViolationState {
  exceedsGarmentPrintArea: boolean;
  violationEdges: GarmentConstraintEdge[];
}

const EDGE_LABEL_ZH: Record<GarmentConstraintEdge, string> = {
  left: "左",
  right: "右",
  top: "上",
  bottom: "下",
};

export function garmentViolationFromOverflow(
  overflow: LayerOverflowState,
): GarmentViolationState {
  return {
    exceedsGarmentPrintArea: overflow.exceedsPrintArea,
    violationEdges: overflow.overflowEdges,
  };
}

export function formatGarmentPrintAreaCmPair(bounds: PrintAreaCmBounds): string {
  return `${bounds.width.toFixed(0)} × ${bounds.height.toFixed(0)} cm`;
}

/** Workspace 內顯示目前尺碼可印區比例（線性 mapping 原點對齊） */
export function getGarmentConstraintOverlayPctInWorkspace(
  workspacePrintArea: PrintAreaCmBounds,
  garmentPrintArea: PrintAreaCmBounds,
): {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
} {
  return {
    leftPct: 0,
    topPct: 0,
    widthPct: (garmentPrintArea.width / workspacePrintArea.width) * 100,
    heightPct: (garmentPrintArea.height / workspacePrintArea.height) * 100,
  };
}

export function formatGarmentConstraintLayerWarning(
  state: GarmentViolationState,
): string {
  if (!state.exceedsGarmentPrintArea) {
    return "";
  }
  if (state.violationEdges.length === 0) {
    return "超出目前尺碼可印範圍";
  }
  const edges = state.violationEdges.map((edge) => EDGE_LABEL_ZH[edge]).join("、");
  return `超出目前尺碼可印範圍（${edges}側）`;
}

export function getGarmentConstraintInspectorWarnings(
  violation: GarmentViolationState,
  exceedsSafeZone: boolean,
): string[] {
  const warnings: string[] = [];
  if (violation.exceedsGarmentPrintArea) {
    warnings.push(formatGarmentConstraintLayerWarning(violation));
  } else if (exceedsSafeZone) {
    warnings.push("超出安全區域");
  }
  return warnings;
}

export function formatGarmentConstraintStatusWarning(
  violationCount: number,
  size: string,
  garmentPrintArea: PrintAreaCmBounds,
): string | null {
  if (violationCount <= 0) {
    return null;
  }
  return `${violationCount} 個圖層超出尺碼 ${size} 可印範圍（${formatGarmentPrintAreaCmPair(garmentPrintArea)}）`;
}

export function countGarmentConstraintViolations(
  states: Iterable<GarmentViolationState>,
): number {
  let count = 0;
  for (const state of states) {
    if (state.exceedsGarmentPrintArea) {
      count += 1;
    }
  }
  return count;
}

export function countConstraintViolationsFromOverflowMap(
  overflowMap: Map<string, LayerOverflowState>,
): number {
  let count = 0;
  for (const state of overflowMap.values()) {
    if (state.exceedsPrintArea) {
      count += 1;
    }
  }
  return count;
}
