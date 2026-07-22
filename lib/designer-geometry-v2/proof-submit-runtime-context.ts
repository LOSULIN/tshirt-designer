/**
 * Proof Submit Runtime Context — Phase 72.2 plumbing.
 *
 * Bridges GeometryRuntimeState ↔ submit FormData ↔ generateProofDocuments.
 * Serializes effective versions only — no geometry snapshot on the wire.
 */

import type { ExportPipelineContext } from "./export-pipeline-context";
import {
  isGeometryRuntimeProductionLocked,
  resolveEffectiveGeometryVersion,
} from "./geometry-runtime-state";
import type { GeometryRuntimeState } from "./geometry-runtime-types";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";

export const PROOF_RUNTIME_CONTEXT_FORM_FIELD = "proofRuntimeContext";

export interface ProofSubmitEffectiveVersions {
  pdf: DesignerGeometryVersion;
  mockup: DesignerGeometryVersion;
  print: DesignerGeometryVersion;
  email: DesignerGeometryVersion;
}

/** Client-resolved submit runtime — versions only, no snapshot payload. */
export interface ProofSubmitRuntimeContext {
  geometryVersion: DesignerGeometryVersion;
  effectiveVersions: ProofSubmitEffectiveVersions;
  resolvedAt: string;
}

export interface ProofSubmitPdfRuntimeForward {
  geometryVersion: DesignerGeometryVersion;
  pipelineContextBySide?: Partial<Record<import("@/lib/constants").Side, ExportPipelineContext>>;
}

function resolveEffectiveVersions(
  state: GeometryRuntimeState,
  productionLocked: boolean,
): ProofSubmitEffectiveVersions {
  return {
    pdf: resolveEffectiveGeometryVersion(state, "pdf", { productionLocked }),
    mockup: resolveEffectiveGeometryVersion(state, "png", { productionLocked }),
    print: DESIGNER_GEOMETRY_VERSION.V1,
    email: resolveEffectiveGeometryVersion(state, "email", { productionLocked }),
  };
}

export function createDefaultProofSubmitRuntimeContext(
  resolvedAt: string = new Date().toISOString(),
): ProofSubmitRuntimeContext {
  const productionLocked = isGeometryRuntimeProductionLocked();
  const geometryVersion = productionLocked
    ? DESIGNER_GEOMETRY_VERSION.V1
    : DESIGNER_GEOMETRY_VERSION.V1;

  return {
    geometryVersion,
    effectiveVersions: {
      pdf: DESIGNER_GEOMETRY_VERSION.V1,
      mockup: DESIGNER_GEOMETRY_VERSION.V1,
      print: DESIGNER_GEOMETRY_VERSION.V1,
      email: DESIGNER_GEOMETRY_VERSION.V1,
    },
    resolvedAt,
  };
}

/**
 * Resolve submit runtime from GeometryRuntimeState (client or server replay).
 */
export function resolveProofSubmitRuntimeContext(
  state: GeometryRuntimeState,
  options?: { productionLocked?: boolean; resolvedAt?: string },
): ProofSubmitRuntimeContext {
  const productionLocked =
    options?.productionLocked ?? isGeometryRuntimeProductionLocked();
  const geometryVersion = productionLocked
    ? DESIGNER_GEOMETRY_VERSION.V1
    : state.geometryVersion;

  return {
    geometryVersion,
    effectiveVersions: resolveEffectiveVersions(
      productionLocked
        ? {
            ...state,
            geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
            exportRuntime: {
              png: false,
              zip: false,
              pdf: false,
              email: false,
            },
          }
        : state,
      productionLocked,
    ),
    resolvedAt: options?.resolvedAt ?? new Date().toISOString(),
  };
}

/**
 * Normalize parsed client context — production server always forces V1.
 */
export function normalizeProofSubmitRuntimeContext(
  runtimeContext: ProofSubmitRuntimeContext | undefined,
  options?: { productionLocked?: boolean },
): ProofSubmitRuntimeContext {
  if (!runtimeContext) {
    return createDefaultProofSubmitRuntimeContext();
  }

  const productionLocked =
    options?.productionLocked ?? isGeometryRuntimeProductionLocked();
  if (!productionLocked) {
    return runtimeContext;
  }

  return {
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
    effectiveVersions: {
      pdf: DESIGNER_GEOMETRY_VERSION.V1,
      mockup: DESIGNER_GEOMETRY_VERSION.V1,
      print: DESIGNER_GEOMETRY_VERSION.V1,
      email: DESIGNER_GEOMETRY_VERSION.V1,
    },
    resolvedAt: runtimeContext.resolvedAt,
  };
}

export function serializeProofSubmitRuntimeContext(
  runtimeContext: ProofSubmitRuntimeContext,
): string {
  return JSON.stringify(runtimeContext);
}

export function parseProofSubmitRuntimeContext(
  raw: string | null | undefined,
): ProofSubmitRuntimeContext | undefined {
  if (!raw || raw.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProofSubmitRuntimeContext>;
    if (
      parsed.geometryVersion !== DESIGNER_GEOMETRY_VERSION.V1 &&
      parsed.geometryVersion !== DESIGNER_GEOMETRY_VERSION.V2
    ) {
      return undefined;
    }

    const effective = parsed.effectiveVersions;
    if (
      !effective ||
      (effective.pdf !== DESIGNER_GEOMETRY_VERSION.V1 &&
        effective.pdf !== DESIGNER_GEOMETRY_VERSION.V2) ||
      (effective.mockup !== DESIGNER_GEOMETRY_VERSION.V1 &&
        effective.mockup !== DESIGNER_GEOMETRY_VERSION.V2) ||
      (effective.print !== DESIGNER_GEOMETRY_VERSION.V1 &&
        effective.print !== DESIGNER_GEOMETRY_VERSION.V2) ||
      (effective.email !== DESIGNER_GEOMETRY_VERSION.V1 &&
        effective.email !== DESIGNER_GEOMETRY_VERSION.V2)
    ) {
      return undefined;
    }

    return {
      geometryVersion: parsed.geometryVersion,
      effectiveVersions: effective,
      resolvedAt:
        typeof parsed.resolvedAt === "string"
          ? parsed.resolvedAt
          : new Date().toISOString(),
    };
  } catch {
    return undefined;
  }
}

export function parseProofSubmitRuntimeContextFromFormData(
  formData: FormData,
): ProofSubmitRuntimeContext | undefined {
  const raw = formData.get(PROOF_RUNTIME_CONTEXT_FORM_FIELD);
  if (typeof raw !== "string") {
    return undefined;
  }
  return parseProofSubmitRuntimeContext(raw);
}
