/**
 * Print File Generator — 僅 design layer、cm→mm @ 300dpi、透明背景
 */

import type { Gender, Side } from "../proof-domain";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../../design-state";
import { renderPrintExportPng } from "../../print-export-system";
import type { DesignLayersByTemplate } from "../../types";

export async function generatePrintPng(params: {
  gender: Gender;
  side: Side;
  layersByTemplate: DesignLayersByTemplate;
  size?: string;
}): Promise<Uint8Array> {
  const { gender, side, layersByTemplate, size = "M" } = params;
  const layers = getLayersForSlot(layersByTemplate, gender, side);

  if (!hasDesignInSlot(layersByTemplate, gender, side)) {
    throw new Error(`No design on ${side} for print generation`);
  }

  const blob = await renderPrintExportPng(layers, { side, size });
  return new Uint8Array(await blob.arrayBuffer());
}

export async function generatePrintsForOrder(params: {
  gender: Gender;
  layersByTemplate: DesignLayersByTemplate;
  size?: string;
}): Promise<Partial<Record<Side, Uint8Array>>> {
  const prints: Partial<Record<Side, Uint8Array>> = {};

  await Promise.all(
    DESIGN_SIDES.map(async (side) => {
      if (!hasDesignInSlot(params.layersByTemplate, params.gender, side)) {
        return;
      }
      prints[side] = await generatePrintPng({
        gender: params.gender,
        side,
        layersByTemplate: params.layersByTemplate,
        size: params.size,
      });
    }),
  );

  return prints;
}
