/**
 * Mockup Generator — Front / Back T-shirt render.
 * Garment bitmap from Product Registry via product-mockup-submit-render (Phase 75).
 */

import type { ShirtColor, Side, Gender, Size } from "../proof-domain";
import {
  DESIGN_SIDES,
  getLayersForSlot,
  hasDesignInSlot,
} from "../../design-state";
import type { ProofSubmitRuntimeContext } from "@/lib/designer-geometry-v2/proof-submit-runtime-context";
import { renderProofSubmitProductMockupPng } from "@/lib/designer-geometry-v2/product-mockup-submit-render";
import { resolveProofMockupRuntimeForward } from "@/lib/designer-geometry-v2/product-mockup-submit-runtime";
import type { DesignLayersByTemplate } from "../../types";

export async function generateMockupPng(params: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  layersByTemplate: DesignLayersByTemplate;
  size?: Size;
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

  return renderProofSubmitProductMockupPng({
    side,
    shirtColor,
    layers,
    size,
    pipelineContext: mockupForward.pipelineContextBySide?.[side],
  });
}

export async function generateMockupsForOrder(params: {
  gender: Gender;
  shirtColor: ShirtColor;
  layersByTemplate: DesignLayersByTemplate;
  size?: Size;
  proofRuntimeContext?: ProofSubmitRuntimeContext;
}): Promise<Partial<Record<Side, Blob>>> {
  const label = "[submit-diag] generateMockupsForOrder";
  console.log(`${label} ENTER`, { gender: params.gender, size: params.size });
  console.time(label);
  try {
    const mockups: Partial<Record<Side, Blob>> = {};

    await Promise.all(
      DESIGN_SIDES.map(async (side) => {
        const sideLabel = `${label}.${side}`;
        console.log(`${sideLabel} ENTER`);
        console.time(sideLabel);
        try {
          if (!hasDesignInSlot(params.layersByTemplate, params.gender, side)) {
            console.log(`${sideLabel} EXIT skip (no design)`);
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
          console.log(`${sideLabel} EXIT ok`, {
            bytes: mockups[side]?.size,
          });
        } catch (error) {
          console.log(`${sideLabel} EXIT error`, error);
          throw error;
        } finally {
          console.timeEnd(sideLabel);
        }
      }),
    );

    console.log(`${label} EXIT ok`, { sides: Object.keys(mockups) });
    return mockups;
  } catch (error) {
    console.log(`${label} EXIT error`, error);
    throw error;
  } finally {
    console.timeEnd(label);
  }
}
