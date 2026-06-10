/**
 * Proof Engine Client — 瀏覽器端產生 artifacts 並組裝 submit payload。
 */

import type { Gender, ShirtColor, Side, Size } from "../constants";
import type { ApplicationFormData, DesignLayersByTemplate } from "../types";
import { generateProofArtifacts } from "./generate-artifacts";
import type { ProofArtifactsInput, ProofOrder } from "./types";

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
): Promise<ProofArtifactsInput> {
  return generateProofArtifacts(order);
}

function artifactToPngBlob(data: Uint8Array | Buffer): Blob {
  const bytes =
    data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data);
  return new Blob([bytes], { type: "image/png" });
}

export function appendProofArtifactsToFormData(
  formData: FormData,
  artifacts: ProofArtifactsInput,
): void {
  for (const side of ["front", "back"] as const) {
    const mockup = artifacts.mockups[side];
    if (mockup && mockup.length > 0) {
      formData.append(
        `proof-mockup-${side}`,
        artifactToPngBlob(mockup),
        `mockup-${side}.png`,
      );
    }

    const print = artifacts.prints[side];
    if (print && print.length > 0) {
      formData.append(
        `proof-print-${side}`,
        artifactToPngBlob(print),
        `print-${side}.png`,
      );
    }
  }
}

export { generateProofArtifacts };
