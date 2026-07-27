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
}): Promise<Blob> {
  const { gender, side, layersByTemplate, size = "M" } = params;
  const layers = getLayersForSlot(layersByTemplate, gender, side);

  if (!hasDesignInSlot(layersByTemplate, gender, side)) {
    throw new Error(`No design on ${side} for print generation`);
  }

  return renderPrintExportPng(layers, { side, size });
}

export async function generatePrintsForOrder(params: {
  gender: Gender;
  layersByTemplate: DesignLayersByTemplate;
  size?: string;
}): Promise<Partial<Record<Side, Blob>>> {
  const label = "[submit-diag] generatePrintsForOrder";
  console.log(`${label} ENTER`, { gender: params.gender, size: params.size });
  console.time(label);
  try {
    const prints: Partial<Record<Side, Blob>> = {};

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
          prints[side] = await generatePrintPng({
            gender: params.gender,
            side,
            layersByTemplate: params.layersByTemplate,
            size: params.size,
          });
          console.log(`${sideLabel} EXIT ok`, {
            bytes: prints[side]?.size,
          });
        } catch (error) {
          console.log(`${sideLabel} EXIT error`, error);
          throw error;
        } finally {
          console.timeEnd(sideLabel);
        }
      }),
    );

    console.log(`${label} EXIT ok`, { sides: Object.keys(prints) });
    return prints;
  } catch (error) {
    console.log(`${label} EXIT error`, error);
    throw error;
  } finally {
    console.timeEnd(label);
  }
}
