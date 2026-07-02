/**
 * Designer Workspace — 固定設計工作區（視覺層）
 * 與商品尺碼解耦；尺碼差異僅反映在「目前可印尺寸」與溢出警告。
 */

import type { Side } from "./constants";
import type { PrintAreaCmBounds } from "./design-cm";
import {
  getDesignerFactoryOverlayContainerStyle,
  getDesignerOrangeSafeZonePctInBlue,
} from "./coordinates/preview";
import { resolveGarmentPrintAreaCm } from "./garment-anchor-runtime";

/** 工作區視覺錨點尺碼（與單一 Template 基準一致） */
export const DESIGNER_WORKSPACE_REFERENCE_SIZE = "M";

export function getDesignerWorkspacePrintAreaCm(side: Side): PrintAreaCmBounds {
  return resolveGarmentPrintAreaCm(DESIGNER_WORKSPACE_REFERENCE_SIZE, side);
}

export function getDesignerWorkspaceContainerStyle(side: Side) {
  return getDesignerFactoryOverlayContainerStyle(
    side,
    DESIGNER_WORKSPACE_REFERENCE_SIZE,
  );
}

export function getDesignerWorkspaceOrangeSafeZonePct(side: Side) {
  return getDesignerOrangeSafeZonePctInBlue(
    DESIGNER_WORKSPACE_REFERENCE_SIZE,
    side,
  );
}
