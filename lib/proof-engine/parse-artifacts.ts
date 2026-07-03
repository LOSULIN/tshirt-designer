/**
 * 從 submit FormData 解析 Proof Engine artifacts。
 */

import type { Side } from "./proof-domain";
import type { ProofArtifactsInput } from "./types";

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

export async function parseProofArtifactsFromFormData(
  formData: FormData,
): Promise<ProofArtifactsInput> {
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
}

export function hasProofArtifacts(artifacts: ProofArtifactsInput): boolean {
  const hasMockup = Object.values(artifacts.mockups).some(
    (b) => b && b.length > 0,
  );
  const hasPrint = Object.values(artifacts.prints).some(
    (b) => b && b.length > 0,
  );
  return hasMockup || hasPrint;
}
