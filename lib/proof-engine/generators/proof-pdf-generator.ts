/**
 * Proof PDF Generator — 委派至工廠級 A4 template。
 */

import type { Side } from "../proof-domain";
import type { ProofOrder } from "../types";
import type { ExportPipelineContext } from "@/lib/designer-geometry-v2/export-pipeline-context";
import type { DesignerGeometryVersion } from "@/lib/designer-geometry-v2/geometry-version";
import {
  generateFactoryProofPdf,
  type FactoryProofPdfInput,
} from "./factory-proof-pdf-template";

export {
  FACTORY_PROOF_A4_WIDTH_PT,
  FACTORY_PROOF_A4_HEIGHT_PT,
  FACTORY_PROOF_DPI,
  FACTORY_PROOF_TOLERANCE_CM,
} from "./factory-proof-pdf-template";

export interface ProofPdfInput {
  order: ProofOrder;
  version: number;
  mockupImages?: Partial<Record<Side, Uint8Array | Buffer>>;
  printImages?: Partial<Record<Side, Uint8Array | Buffer>>;
  geometryVersion?: DesignerGeometryVersion;
  pipelineContextBySide?: Partial<Record<Side, ExportPipelineContext>>;
  pipelineContext?: ExportPipelineContext;
}

export async function generateProofPdf(
  input: ProofPdfInput,
): Promise<Uint8Array> {
  const label = "[submit-diag] generateProofPdf";
  console.log(`${label} ENTER`, {
    orderId: input.order.order_id,
    version: input.version,
    geometryVersion: input.geometryVersion,
  });
  console.time(label);
  try {
    const factoryInput: FactoryProofPdfInput = {
      order: input.order,
      version: input.version,
      mockupImages: input.mockupImages,
      printImages: input.printImages,
      geometryVersion: input.geometryVersion,
      pipelineContextBySide: input.pipelineContextBySide,
      pipelineContext: input.pipelineContext,
    };
    const result = await generateFactoryProofPdf(factoryInput);
    console.log(`${label} EXIT ok`, { bytes: result.byteLength });
    return result;
  } catch (error) {
    console.log(`${label} EXIT error`, error);
    throw error;
  } finally {
    console.timeEnd(label);
  }
}
