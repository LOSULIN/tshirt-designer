/**
 * PDF Submit + Download Runtime Cutover — Phase 72.3.
 *
 * Single forward resolver for Proof PDF placement via export-pdf-runtime.
 * Submit and download paths must produce identical pipelineContext for the same input.
 */

import type { Side } from "@/lib/constants";
import type { ProofPdfInput } from "@/lib/proof-engine/generators/proof-pdf-generator";
import type { ProofOrder } from "@/lib/proof-engine/types";
import type { ExportPipelineContext } from "./export-pipeline-context";
import {
  buildPdfExportRuntimeCompareLog,
  resolvePdfExportPipelineContext,
} from "./export-pdf-runtime";
import { isGeometryRuntimeProductionLocked } from "./geometry-runtime-state";
import {
  normalizeProofSubmitRuntimeContext,
  type ProofSubmitPdfRuntimeForward,
  type ProofSubmitRuntimeContext,
} from "./proof-submit-runtime-context";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";

export type ProofPdfRuntimeForward = ProofSubmitPdfRuntimeForward;

const PDF_SIDES = ["front", "back"] as const satisfies readonly Side[];

function isSubmitPdfRuntimeCompareEnabled(): boolean {
  return process.env.EXPORT_PRODUCT_RUNTIME_COMPARE === "true";
}

/**
 * Canonical Proof PDF runtime forward — delegates resolvePdfExportPipelineContext only.
 */
export function resolveProofPdfRuntimeForward(
  order: Pick<ProofOrder, "size">,
  proofRuntimeContext?: ProofSubmitRuntimeContext,
  options?: { productionLocked?: boolean },
): ProofPdfRuntimeForward {
  const normalized = normalizeProofSubmitRuntimeContext(
    proofRuntimeContext,
    options,
  );
  const pdfVersion = normalized.effectiveVersions.pdf;
  const garmentSize = order.size ?? "M";

  if (pdfVersion === DESIGNER_GEOMETRY_VERSION.V1) {
    return { geometryVersion: DESIGNER_GEOMETRY_VERSION.V1 };
  }

  const pipelineContextBySide: Partial<Record<Side, ExportPipelineContext>> =
    {};
  for (const side of PDF_SIDES) {
    pipelineContextBySide[side] = resolvePdfExportPipelineContext({
      side,
      size: garmentSize,
      geometryVersion: pdfVersion,
    });
  }

  return {
    geometryVersion: pdfVersion,
    pipelineContextBySide,
  };
}

/** @deprecated Use resolveProofPdfRuntimeForward */
export const resolveProofSubmitPdfRuntimeForward = resolveProofPdfRuntimeForward;

/**
 * Download PDF path — same forward as submit for a given effective pdf version.
 */
export function resolveProofPdfRuntimeForwardFromEffectiveVersion(
  order: Pick<ProofOrder, "size">,
  pdfVersion: DesignerGeometryVersion,
  options?: { productionLocked?: boolean },
): ProofPdfRuntimeForward {
  const productionLocked =
    options?.productionLocked ?? isGeometryRuntimeProductionLocked();
  const effectivePdf = productionLocked
    ? DESIGNER_GEOMETRY_VERSION.V1
    : pdfVersion;

  return resolveProofPdfRuntimeForward(
    order,
    {
      geometryVersion: effectivePdf,
      effectiveVersions: {
        pdf: effectivePdf,
        mockup: DESIGNER_GEOMETRY_VERSION.V1,
        print: DESIGNER_GEOMETRY_VERSION.V1,
        email: DESIGNER_GEOMETRY_VERSION.V1,
      },
      resolvedAt: new Date().toISOString(),
    },
    { productionLocked },
  );
}

export function applyProofPdfRuntimeForward(
  input: ProofPdfInput,
  forward: ProofPdfRuntimeForward,
): ProofPdfInput {
  return {
    ...input,
    geometryVersion: forward.geometryVersion,
    pipelineContextBySide: forward.pipelineContextBySide,
  };
}

function pipelineContextsMatch(
  left: ProofPdfRuntimeForward,
  right: ProofPdfRuntimeForward,
): boolean {
  if (left.geometryVersion !== right.geometryVersion) {
    return false;
  }

  if (left.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1) {
    return (
      left.pipelineContextBySide == null && right.pipelineContextBySide == null
    );
  }

  for (const side of PDF_SIDES) {
    const a = left.pipelineContextBySide?.[side];
    const b = right.pipelineContextBySide?.[side];
    if (!a || !b) return false;
    if (a.geometryVersion !== b.geometryVersion) return false;
    if (a.snapshot?.artworkStage.top !== b.snapshot?.artworkStage.top) {
      return false;
    }
    if (a.snapshot?.collar.y !== b.snapshot?.collar.y) return false;
    if (
      a.visualCompensation.offsetYPercent !==
      b.visualCompensation.offsetYPercent
    ) {
      return false;
    }
  }

  return true;
}

/** Test helper — submit forward must match download forward for same effective pdf version. */
export function proofPdfRuntimeForwardsMatch(
  left: ProofPdfRuntimeForward,
  right: ProofPdfRuntimeForward,
): boolean {
  return pipelineContextsMatch(left, right);
}

/**
 * Shadow runtime — Submit PDF V1 vs V2 placement when EXPORT_PRODUCT_RUNTIME_COMPARE=true.
 * Does not affect PDF output.
 */
export function maybeLogProofSubmitPdfRuntimeCompare(params: {
  order: Pick<ProofOrder, "size">;
  proofRuntimeContext?: ProofSubmitRuntimeContext;
  forward?: ProofPdfRuntimeForward;
}): void {
  if (!isSubmitPdfRuntimeCompareEnabled()) return;

  const forward =
    params.forward ??
    resolveProofPdfRuntimeForward(params.order, params.proofRuntimeContext);

  for (const side of PDF_SIDES) {
    const log = buildPdfExportRuntimeCompareLog(side);
    const activeContext = forward.pipelineContextBySide?.[side];

    console.info("[EXPORT_PRODUCT_RUNTIME_COMPARE] Submit PDF Runtime", {
      path: "submit",
      side,
      geometryVersion: forward.geometryVersion,
      activeVersion: activeContext?.geometryVersion ?? forward.geometryVersion,
      v1PrintArea: log.v1.printArea,
      v2PrintArea: log.v2.printArea,
      delta: log.delta,
      v1PresentationOffsetYPt: log.v1.presentationOffsetYPt,
      v2PresentationOffsetYPt: log.v2.presentationOffsetYPt,
    });
  }
}
