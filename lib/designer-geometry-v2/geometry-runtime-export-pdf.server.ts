/**
 * Server-only Proof PDF export with geometry runtime.
 * Keep separate from geometry-runtime-export.ts (client-safe download entry).
 */

import type { ProofPdfInput } from "@/lib/proof-engine/generators/proof-pdf-generator";
import { generateProofPdf } from "@/lib/proof-engine/generators/proof-pdf-generator";
import {
  applyProofPdfRuntimeForward,
  resolveProofPdfRuntimeForwardFromEffectiveVersion,
} from "./export-pdf-submit-runtime";
import type { DesignerGeometryVersion } from "./geometry-version";

export async function generateProofPdfWithGeometryRuntime(
  input: Omit<ProofPdfInput, "geometryVersion" | "pipelineContext" | "pipelineContextBySide"> & {
    geometryVersion: DesignerGeometryVersion;
  },
): Promise<Uint8Array> {
  const forward = resolveProofPdfRuntimeForwardFromEffectiveVersion(
    input.order,
    input.geometryVersion,
  );
  return generateProofPdf(applyProofPdfRuntimeForward(input, forward));
}
