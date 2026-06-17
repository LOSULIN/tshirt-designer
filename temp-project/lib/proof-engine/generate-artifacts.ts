/**
 * Client-side artifact generation — 統一呼叫 mockup / print generators。
 * 瀏覽器環境專用（canvas render）。
 */

import type { ProofArtifactsInput, ProofOrder } from "./types";
import { generateMockupsForOrder } from "./generators/mockup-generator";
import { generatePrintsForOrder } from "./generators/print-generator";
import {
  DESIGN_SIDES,
  hasAnyDesign,
  hasDesignInSlot,
} from "../design-state";

export async function generateProofArtifacts(
  order: ProofOrder,
): Promise<ProofArtifactsInput> {
  if (!hasAnyDesign(order.layers_by_template)) {
    throw new Error("尚無可產生校稿的設計內容");
  }

  const hasSlot = DESIGN_SIDES.some((side) =>
    hasDesignInSlot(order.layers_by_template, order.gender, side),
  );
  if (!hasSlot) {
    throw new Error("目前模板尚無可產生校稿的設計內容");
  }

  const [mockups, prints] = await Promise.all([
    generateMockupsForOrder({
      gender: order.gender,
      shirtColor: order.shirt_color,
      layersByTemplate: order.layers_by_template,
    }),
    generatePrintsForOrder({
      gender: order.gender,
      layersByTemplate: order.layers_by_template,
    }),
  ]);

  return { mockups, prints };
}
