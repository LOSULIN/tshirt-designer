/**
 * Mockup Generator — Front / Back T-shirt render.
 * V1: mockup-export.ts (legacy flat placement).
 * V2: Product Mockup Runtime via product-mockup-submit-runtime (Phase 72.4).
 */

import type { ShirtColor, Side, Gender } from "../proof-domain";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../../design-state";
import { renderMockupPreviewPng } from "../../mockup-export";
import type { ProofSubmitRuntimeContext } from "@/lib/designer-geometry-v2/proof-submit-runtime-context";
import { renderProofSubmitProductMockupPng } from "@/lib/designer-geometry-v2/product-mockup-submit-render";
import {
  resolveProofMockupRuntimeForward,
  shouldUseProofProductMockupRuntime,
} from "@/lib/designer-geometry-v2/product-mockup-submit-runtime";
import type { DesignLayersByTemplate } from "../../types";

export async function generateMockupPng(params: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  layersByTemplate: DesignLayersByTemplate;
  size?: string;
  proofRuntimeContext?: ProofSubmitRuntimeContext;
}): Promise<Blob> {
  const { gender, side, shirtColor, layersByTemplate, size = "M" } = params;
  const layers = getLayersForSlot(layersByTemplate, gender, side);

  if (!hasDesignInSlot(layersByTemplate, gender, side)) {
    throw new Error(`No design on ${side} for mockup generation`);
  }

  const mockupForward = resolveProofMockupRuntimeForward(
    { size },
    params.proofRuntimeContext,
  );

  if (shouldUseProofProductMockupRuntime(mockupForward)) {
    return renderProofSubmitProductMockupPng({
      side,
      shirtColor,
      layers,
      size,
      pipelineContext: mockupForward.pipelineContextBySide?.[side],
    });
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
  proofRuntimeContext?: ProofSubmitRuntimeContext;
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
        proofRuntimeContext: params.proofRuntimeContext,
      });
    }),
  );

  return mockups;
}
