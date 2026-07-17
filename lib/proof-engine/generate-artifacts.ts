/**
 * Client-side artifact generation — 統一呼叫 mockup / print generators。
 * 瀏覽器環境專用（canvas render）。
 */

import {
  computeExportFingerprint,
  getCachedArtifacts,
  setCachedArtifacts,
} from "../export/artifact-cache";
import { submissionProfiler } from "../submission/profiler";
import type { ProofArtifactsInput, ProofOrder } from "./types";
import { generateMockupsForOrder } from "./generators/mockup-generator";
import { generatePrintsForOrder } from "./generators/print-generator";
import {
  DESIGN_SIDES,
  hasAnyDesign,
  hasDesignInSlot,
} from "../design-state";

export async function generateProofArtifacts(
  order: ProofOrder,
): Promise<ProofArtifactsInput> {
  if (!hasAnyDesign(order.layers_by_template)) {
    throw new Error("尚無可產生校稿的設計內容");
  }

  const hasSlot = DESIGN_SIDES.some((side) =>
    hasDesignInSlot(order.layers_by_template, order.gender, side),
  );
  if (!hasSlot) {
    throw new Error("目前模板尚無可產生校稿的設計內容");
  }

  const fingerprint = computeExportFingerprint(order);
  const cached = getCachedArtifacts(fingerprint);
  if (cached) {
    submissionProfiler.record("Generate Artifacts", 0, "client");
    submissionProfiler.record("Generate Mockups", 0, "client");
    submissionProfiler.record("Generate Prints", 0, "client");
    return cached;
  }

  return submissionProfiler.run("Generate Artifacts", "client", async () => {
    const [mockups, prints] = await Promise.all([
      submissionProfiler.run("Generate Mockups", "client", () =>
        generateMockupsForOrder({
          gender: order.gender,
          shirtColor: order.shirt_color,
          layersByTemplate: order.layers_by_template,
          size: order.size,
        }),
      ),
      submissionProfiler.run("Generate Prints", "client", () =>
        generatePrintsForOrder({
          gender: order.gender,
          layersByTemplate: order.layers_by_template,
          size: order.size,
        }),
      ),
    ]);

    const artifacts = { mockups, prints };
    setCachedArtifacts(fingerprint, artifacts);
    return artifacts;
  });
}
