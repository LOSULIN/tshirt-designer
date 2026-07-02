/**
 * Current Garment Constraint Visualization — Step 13.1B
 * 純呈現層：在固定 Workspace 藍框內標示目前尺碼可印區與不可印遮罩。
 * 不修改 Workspace / Placement / Constraint Runtime。
 */

import type { PrintAreaCmBounds } from "./design-cm";

export interface GarmentConstraintLayoutPct {
  leftPct: number;
  topPct: number;
  widthPct: number;
  heightPct: number;
}

const PCT_EPS = 0.05;

/** 目前尺碼可印區於 Workspace 內的 %（原點左上；超出 Workspace 時裁切至 100%） */
export function getPrintableConstraintPctInWorkspace(
  workspacePrintArea: PrintAreaCmBounds,
  garmentPrintArea: PrintAreaCmBounds,
): GarmentConstraintLayoutPct {
  const widthPct =
    (garmentPrintArea.width / workspacePrintArea.width) * 100;
  const heightPct =
    (garmentPrintArea.height / workspacePrintArea.height) * 100;
  return {
    leftPct: 0,
    topPct: 0,
    widthPct: Math.min(100, widthPct),
    heightPct: Math.min(100, heightPct),
  };
}

/**
 * Workspace 藍框內、目前可印區以外的遮罩矩形（L 形：右側帶 + 下方帶）。
 * 尺碼可印 ≥ Workspace（如 M、XXXL）時回傳空陣列。
 */
export function getGarmentConstraintExclusionMaskRectsInWorkspace(
  workspacePrintArea: PrintAreaCmBounds,
  garmentPrintArea: PrintAreaCmBounds,
): GarmentConstraintLayoutPct[] {
  const printable = getPrintableConstraintPctInWorkspace(
    workspacePrintArea,
    garmentPrintArea,
  );
  const masks: GarmentConstraintLayoutPct[] = [];

  if (printable.widthPct < 100 - PCT_EPS) {
    masks.push({
      leftPct: printable.widthPct,
      topPct: 0,
      widthPct: 100 - printable.widthPct,
      heightPct: 100,
    });
  }

  if (printable.heightPct < 100 - PCT_EPS) {
    masks.push({
      leftPct: 0,
      topPct: printable.heightPct,
      widthPct: printable.widthPct,
      heightPct: 100 - printable.heightPct,
    });
  }

  return masks;
}

export function hasGarmentConstraintExclusionMask(
  workspacePrintArea: PrintAreaCmBounds,
  garmentPrintArea: PrintAreaCmBounds,
): boolean {
  return (
    getGarmentConstraintExclusionMaskRectsInWorkspace(
      workspacePrintArea,
      garmentPrintArea,
    ).length > 0
  );
}
