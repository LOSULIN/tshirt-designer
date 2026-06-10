/**
 * Proof PDF Generator — 委派至工廠級 A4 template。
 */

import type { Side } from "../../constants";
import type { ProofOrder } from "../types";
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
}

export async function generateProofPdf(
  input: ProofPdfInput,
): Promise<Uint8Array> {
  const factoryInput: FactoryProofPdfInput = {
    order: input.order,
    version: input.version,
    mockupImages: input.mockupImages,
  };
  return generateFactoryProofPdf(factoryInput);
}
