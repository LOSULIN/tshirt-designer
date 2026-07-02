/**
 * Mockup Generator — Front / Back T-shirt render（cm → px + template overlay）
 */

import type { ShirtColor, Side } from "../../constants";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../../design-state";
import { renderMockupPreviewPng } from "../../mockup-export";
import type { Gender } from "../../constants";
import type { DesignLayersByTemplate } from "../../types";

export async function generateMockupPng(params: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  layersByTemplate: DesignLayersByTemplate;
  size?: string;
}): Promise<Uint8Array> {
  const { gender, side, shirtColor, layersByTemplate, size = "M" } = params;
  const layers = getLayersForSlot(layersByTemplate, gender, side);

  if (!hasDesignInSlot(layersByTemplate, gender, side)) {
    throw new Error(`No design on ${side} for mockup generation`);
  }

  const blob = await renderMockupPreviewPng({
    shirtColor,
    side,
    layers,
    size,
  });
  return new Uint8Array(await blob.arrayBuffer());
}

export async function generateMockupsForOrder(params: {
  gender: Gender;
  shirtColor: ShirtColor;
  layersByTemplate: DesignLayersByTemplate;
  size?: string;
}): Promise<Partial<Record<Side, Uint8Array>>> {
  const mockups: Partial<Record<Side, Uint8Array>> = {};

  await Promise.all(
    DESIGN_SIDES.map(async (side) => {
      if (!hasDesignInSlot(params.layersByTemplate, params.gender, side)) {
        return;
      }
      mockups[side] = await generateMockupPng({
        gender: params.gender,
        side,
        shirtColor: params.shirtColor,
        layersByTemplate: params.layersByTemplate,
        size: params.size,
      });
    }),
  );

  return mockups;
}
