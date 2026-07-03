/**
 * Proof Engine — layers slot accessors (pure domain).
 * No Editor / Coordinate / Preview dependencies.
 */

import type { Gender, Side } from "./proof-domain";
import type { DesignLayer, DesignLayersByTemplate } from "../types";

export const PROOF_DESIGN_SIDES = ["front", "back"] as const satisfies readonly Side[];

export function getLayersForSlot(
  state: DesignLayersByTemplate,
  gender: Gender,
  side: Side,
): DesignLayer[] {
  return state[gender][side];
}

export function hasDesignInSlot(
  state: DesignLayersByTemplate,
  gender: Gender,
  side: Side,
): boolean {
  return getLayersForSlot(state, gender, side).length > 0;
}
