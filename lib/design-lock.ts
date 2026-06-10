import {
  DESIGN_GENDERS,
  DESIGN_SIDES,
  getLayersForSlot,
  type DesignLayersByTemplate,
} from "./design-state";

/** Submit 後鎖定所有圖層 */
export function lockAllLayersInTemplate(
  state: DesignLayersByTemplate,
): DesignLayersByTemplate {
  const next = { ...state } as DesignLayersByTemplate;

  for (const gender of DESIGN_GENDERS) {
    next[gender] = { ...next[gender] };
    for (const side of DESIGN_SIDES) {
      next[gender][side] = getLayersForSlot(next, gender, side).map((layer) => ({
        ...layer,
        locked: true,
      }));
    }
  }

  return next;
}
