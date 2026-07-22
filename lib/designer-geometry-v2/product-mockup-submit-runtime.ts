/**
 * Product Mockup Submit Runtime — Phase 72.4.
 *
 * Forward resolver for proof submit mockups. Render lives in product-mockup-submit-render.ts.
 * V1 falls back to legacy mockup-export.ts (unchanged).
 */

import type { Side } from "@/lib/constants";
import type { ProofOrder } from "@/lib/proof-engine/types";
import type { ExportPipelineContext } from "./export-pipeline-context";
import { resolveExportPipelineContext } from "./export-pipeline-context";
import {
  isGeometryRuntimeProductionLocked,
} from "./geometry-runtime-state";
import {
  normalizeProofSubmitRuntimeContext,
  type ProofSubmitRuntimeContext,
} from "./proof-submit-runtime-context";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";

const MOCKUP_EXPORT_SURFACE = "png" as const;
const PROOF_MOCKUP_SIDES = ["front", "back"] as const satisfies readonly Side[];

export interface ProofMockupRuntimeForward {
  geometryVersion: DesignerGeometryVersion;
  pipelineContextBySide?: Partial<Record<Side, ExportPipelineContext>>;
}

export function shouldUseProofProductMockupRuntime(
  forward: ProofMockupRuntimeForward,
): boolean {
  return forward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2;
}

/**
 * Canonical proof mockup runtime forward — delegates resolveExportPipelineContext only.
 */
export function resolveProofMockupRuntimeForward(
  order: Pick<ProofOrder, "size">,
  proofRuntimeContext?: ProofSubmitRuntimeContext,
  options?: { productionLocked?: boolean },
): ProofMockupRuntimeForward {
  const normalized = normalizeProofSubmitRuntimeContext(
    proofRuntimeContext,
    options,
  );
  const mockupVersion = normalized.effectiveVersions.mockup;
  const garmentSize = order.size ?? "M";

  if (mockupVersion === DESIGNER_GEOMETRY_VERSION.V1) {
    return { geometryVersion: DESIGNER_GEOMETRY_VERSION.V1 };
  }

  const pipelineContextBySide: Partial<Record<Side, ExportPipelineContext>> =
    {};
  for (const side of PROOF_MOCKUP_SIDES) {
    pipelineContextBySide[side] = resolveExportPipelineContext({
      side,
      size: garmentSize,
      surface: MOCKUP_EXPORT_SURFACE,
      geometryVersion: mockupVersion,
    });
  }

  return {
    geometryVersion: mockupVersion,
    pipelineContextBySide,
  };
}

/**
 * Download product mockup path — same forward as submit for a given effective mockup version.
 */
export function resolveProofMockupRuntimeForwardFromEffectiveVersion(
  order: Pick<ProofOrder, "size">,
  mockupVersion: DesignerGeometryVersion,
  options?: { productionLocked?: boolean },
): ProofMockupRuntimeForward {
  const productionLocked =
    options?.productionLocked ?? isGeometryRuntimeProductionLocked();
  const effectiveMockup = productionLocked
    ? DESIGNER_GEOMETRY_VERSION.V1
    : mockupVersion;

  return resolveProofMockupRuntimeForward(
    order,
    {
      geometryVersion: effectiveMockup,
      effectiveVersions: {
        pdf: DESIGNER_GEOMETRY_VERSION.V1,
        mockup: effectiveMockup,
        print: DESIGNER_GEOMETRY_VERSION.V1,
        email: DESIGNER_GEOMETRY_VERSION.V1,
      },
      resolvedAt: new Date().toISOString(),
    },
    { productionLocked },
  );
}

function pipelineContextsMatch(
  left: ProofMockupRuntimeForward,
  right: ProofMockupRuntimeForward,
): boolean {
  if (left.geometryVersion !== right.geometryVersion) {
    return false;
  }

  if (left.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1) {
    return (
      left.pipelineContextBySide == null && right.pipelineContextBySide == null
    );
  }

  for (const side of PROOF_MOCKUP_SIDES) {
    const a = left.pipelineContextBySide?.[side];
    const b = right.pipelineContextBySide?.[side];
    if (!a || !b) return false;
    if (a.geometryVersion !== b.geometryVersion) return false;
    if (
      a.photoBridge?.photoArtworkStage?.topPercent !==
      b.photoBridge?.photoArtworkStage?.topPercent
    ) {
      return false;
    }
    if (a.visualCompensation.offsetYPercent !== b.visualCompensation.offsetYPercent) {
      return false;
    }
  }

  return true;
}

export function proofMockupRuntimeForwardsMatch(
  left: ProofMockupRuntimeForward,
  right: ProofMockupRuntimeForward,
): boolean {
  return pipelineContextsMatch(left, right);
}
