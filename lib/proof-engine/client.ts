/**
 * Proof Engine Client — 瀏覽器端產生 artifacts 並組裝 submit payload。
 */

import type { Gender, ShirtColor, Side, Size } from "./proof-domain";
import type { ApplicationFormData, DesignLayersByTemplate } from "../types";
import type { ProofSubmitRuntimeContext } from "@/lib/designer-geometry-v2/proof-submit-runtime-context";
import { generateProofArtifacts } from "./generate-artifacts";
import type { ProofArtifact, ProofArtifactsInput, ProofOrder } from "./types";
import { proofArtifactHasBytes } from "./types";
import { submissionProfiler } from "../submission/profiler";

export function buildProofOrder(params: {
  orderId: string;
  gender: Gender;
  activeSide: Side;
  shirtColor: ShirtColor;
  size: Size;
  layersByTemplate: DesignLayersByTemplate;
  applicant?: ApplicationFormData | null;
  designMeta?: Record<string, unknown>;
}): ProofOrder {
  return {
    order_id: params.orderId,
    gender: params.gender,
    active_side: params.activeSide,
    shirt_color: params.shirtColor,
    size: params.size,
    layers_by_template: params.layersByTemplate,
    applicant: params.applicant
      ? {
          applicantName: params.applicant.applicantName,
          applicantEmail: params.applicant.applicantEmail,
          applicantPhone: params.applicant.applicantPhone,
          notes: params.applicant.notes,
        }
      : null,
    design_meta: params.designMeta,
    created_at: new Date().toISOString(),
  };
}

export async function prepareProofSubmission(
  order: ProofOrder,
  proofRuntimeContext?: ProofSubmitRuntimeContext,
): Promise<ProofArtifactsInput> {
  try {
    submissionProfiler.beginClientSession();
  } catch {
    // Profiler is passive; submit must continue even if instrumentation fails.
  }

  try {
    return await submissionProfiler.run("Prepare", "client", async () =>
      generateProofArtifacts(order, proofRuntimeContext),
    );
  } catch (error) {
    if (submissionProfiler.isEnabled()) {
      throw error;
    }
    return generateProofArtifacts(order, proofRuntimeContext);
  }
}

function artifactToPngBlob(data: ProofArtifact): Blob {
  if (data instanceof Blob) {
    return data;
  }

  const bytes =
    data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data);
  return new Blob([bytes], { type: "image/png" });
}

export function appendProofArtifactsToFormData(
  formData: FormData,
  artifacts: ProofArtifactsInput,
): void {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();

  for (const side of ["front", "back"] as const) {
    const mockup = artifacts.mockups[side];
    if (proofArtifactHasBytes(mockup)) {
      formData.append(
        `proof-mockup-${side}`,
        artifactToPngBlob(mockup!),
        `mockup-${side}.png`,
      );
    }

    const print = artifacts.prints[side];
    if (proofArtifactHasBytes(print)) {
      formData.append(
        `proof-print-${side}`,
        artifactToPngBlob(print!),
        `print-${side}.png`,
      );
    }
  }

  const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    submissionProfiler.record("Append FormData", ended - started, "client");
    submissionProfiler.installClientNetworkWatch();
  } catch {
    // Profiler is passive; FormData assembly must not be blocked.
  }
}

export { generateProofArtifacts };
