/**
 * Mockup Generator — Front / Back T-shirt render（cm → px + template overlay）
 */

import type { ShirtColor, Side, Gender } from "../proof-domain";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../../design-state";
import { renderMockupPreviewPng } from "../../mockup-export";
import type { DesignLayersByTemplate } from "../../types";

export async function generateMockupPng(params: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  layersByTemplate: DesignLayersByTemplate;
  size?: string;
}): Promise<Blob> {
  const { gender, side, shirtColor, layersByTemplate, size = "M" } = params;
  const layers = getLayersForSlot(layersByTemplate, gender, side);

  if (!hasDesignInSlot(layersByTemplate, gender, side)) {
    throw new Error(`No design on ${side} for mockup generation`);
  }

  return renderMockupPreviewPng({
    shirtColor,
    side,
    layers,
    size,
  });
}

export async function generateMockupsForOrder(params: {
  gender: Gender;
  shirtColor: ShirtColor;
  layersByTemplate: DesignLayersByTemplate;
  size?: string;
}): Promise<Partial<Record<Side, Blob>>> {
  const mockups: Partial<Record<Side, Blob>> = {};

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
