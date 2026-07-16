/**
 * Element Snap Threshold — UI (design units) → Runtime (workspace cm).
 *
 * Slider range ELEMENT_SNAP_MIN..MAX stores legacy design units (1 unit = 0.1 cm).
 * Snap runtime expects workspace cm (see DesignerDragSnapOptions.elementSnapThresholdCm).
 */

import {
  ELEMENT_SNAP_MAX,
  ELEMENT_SNAP_MIN,
  ELEMENT_SNAP_THRESHOLD_CM,
} from "@/lib/constants";
import { cmToDesignUnits, designUnitsToCm } from "@/lib/print-area";

export { ELEMENT_SNAP_MIN, ELEMENT_SNAP_MAX };

/** Default slider position: aligns with ELEMENT_SNAP_THRESHOLD_CM (0.8 cm). */
export const DEFAULT_ELEMENT_SNAP_UI_VALUE = cmToDesignUnits(
  ELEMENT_SNAP_THRESHOLD_CM,
);

/** UI slider value (design units) → workspace snap threshold (cm). */
export function uiElementSnapDistanceToWorkspaceCm(uiValue: number): number {
  return designUnitsToCm(uiValue);
}

/** Human-readable label for the layers panel slider. */
export function formatElementSnapDistanceLabel(uiValue: number): string {
  const cm = uiElementSnapDistanceToWorkspaceCm(uiValue);
  return `${cm.toFixed(1)} cm`;
}
