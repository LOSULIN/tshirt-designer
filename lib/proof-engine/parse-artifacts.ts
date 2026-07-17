/**
 * 從 submit FormData 解析 Proof Engine artifacts。
 */

import type { Side } from "./proof-domain";
import type { ProofArtifactsInput } from "./types";
import { proofArtifactHasBytes } from "./types";
import { submissionProfiler } from "../submission/profiler";

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

export async function parseProofArtifactsFromFormData(
  formData: FormData,
): Promise<ProofArtifactsInput> {
  return submissionProfiler.run("Validation", "server-sync", async () => {
    const mockups: Partial<Record<Side, Uint8Array>> = {};
    const prints: Partial<Record<Side, Uint8Array>> = {};

    for (const side of ["front", "back"] as const) {
      const mockup = formData.get(`proof-mockup-${side}`);
      if (mockup instanceof Blob && mockup.size > 0) {
        mockups[side] = await blobToUint8Array(mockup);
      }

      const print = formData.get(`proof-print-${side}`);
      if (print instanceof Blob && print.size > 0) {
        prints[side] = await blobToUint8Array(print);
      }
    }

    return { mockups, prints };
  });
}

export function hasProofArtifacts(artifacts: ProofArtifactsInput): boolean {
  const hasMockup = Object.values(artifacts.mockups).some((artifact) =>
    proofArtifactHasBytes(artifact),
  );
  const hasPrint = Object.values(artifacts.prints).some((artifact) =>
    proofArtifactHasBytes(artifact),
  );
  return hasMockup || hasPrint;
}
