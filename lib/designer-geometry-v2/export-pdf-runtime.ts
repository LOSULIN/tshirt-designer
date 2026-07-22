/**
 * PDF Export Runtime Adapter — Phase 71.4.
 *
 * Resolves factory proof PDF layout/placement from ExportPipelineContext.
 * V1 delegates designer-layout; V2 reads pipelineContext.geometry/snapshot only.
 */

import type { Side } from "@/lib/constants";
import { resolveProductPreviewVisualCompensationPdfOffsetY } from "@/lib/presentation/visual-compensation";
import type {
  DesignerPdfRenderPlacement,
  DesignerPreviewLayout,
} from "@/lib/proof-engine/designer-layout";
import type { PdfMockupContentAreaPt } from "@/lib/proof-engine/generators/pdf-mockup-layout";
import type { ExportPipelineContext } from "./export-pipeline-context";
import { resolveExportPipelineContext } from "./export-pipeline-context";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";
import type { GeometryExportSurface } from "./geometry-runtime-types";

const PDF_EXPORT_SURFACE: GeometryExportSurface = "pdf";

const PDF_RUNTIME_COMPARE_REFERENCE_HEIGHT_PT = 420;

function getDesignerLayoutDelegates(): {
  mapDesignerLayoutToPdf: typeof import("@/lib/proof-engine/designer-layout").mapDesignerLayoutToPdf;
  resolveDesignerPreviewLayout: typeof import("@/lib/proof-engine/designer-layout").resolveDesignerPreviewLayout;
} {
  return require("@/lib/proof-engine/designer-layout");
}

export interface PdfExportRuntimeLayoutRect {
  leftPx: number;
  topPx: number;
  widthPx: number;
  heightPx: number;
}

export interface PdfExportRuntimeCompareLog {
  side: Side;
  v1: {
    printArea: PdfExportRuntimeLayoutRect;
    collarBottomPx: number;
    presentationOffsetYPt: number;
  };
  v2: {
    printArea: PdfExportRuntimeLayoutRect;
    collarBottomPx: number;
    presentationOffsetYPt: number;
  };
  delta: {
    printAreaTopPx: number;
    collarBottomPx: number;
    presentationOffsetYPt: number;
  };
}

export interface ResolvePdfExportPipelineContextInput {
  side: Side;
  size?: string;
  geometryVersion?: DesignerGeometryVersion;
}

/**
 * Resolve pipeline context for PDF export surface (delegate only).
 */
export function resolvePdfExportPipelineContext(
  input: ResolvePdfExportPipelineContextInput,
): ExportPipelineContext {
  return resolveExportPipelineContext({
    side: input.side,
    size: input.size ?? "M",
    surface: PDF_EXPORT_SURFACE,
    geometryVersion: input.geometryVersion,
  });
}

function resolveV2PdfExportRuntimeLayout(
  side: Side,
  pipelineContext: ExportPipelineContext,
): DesignerPreviewLayout {
  const { resolveDesignerPreviewLayout } = getDesignerLayoutDelegates();
  const geometry = pipelineContext.geometry;
  const snapshot = pipelineContext.snapshot;
  if (!geometry || !snapshot) {
    return resolveDesignerPreviewLayout(side);
  }

  const v1Shell = resolveDesignerPreviewLayout(side);
  const { getRuntimeTemplateCanvas } = require("@/lib/template-profile/runtime");
  const { getPreviewGarmentVisualScale } = require("@/lib/preview-runtime");
  const { scaleGarmentY } = require("@/lib/coordinates/garment");
  const canvas = getRuntimeTemplateCanvas();
  const garmentVisualScale = getPreviewGarmentVisualScale();

  return {
    ...v1Shell,
    printArea: {
      leftPx: geometry.artworkStage.left,
      topPx: geometry.artworkStage.top,
      widthPx: geometry.artworkStage.width,
      heightPx: geometry.artworkStage.height,
    },
    collarBottomPx: scaleGarmentY(
      snapshot.collar.y,
      garmentVisualScale,
      canvas.heightPx,
    ),
    collarCenterXPx: snapshot.collar.x,
  };
}

/**
 * Designer preview layout for PDF — V1 legacy path; V2 snapshot-driven print/collar.
 */
export function resolvePdfExportRuntimeLayout(
  side: Side,
  pipelineContext?: ExportPipelineContext,
): DesignerPreviewLayout {
  const { resolveDesignerPreviewLayout } = getDesignerLayoutDelegates();
  if (
    !pipelineContext ||
    pipelineContext.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1
  ) {
    return resolveDesignerPreviewLayout(side);
  }

  return resolveV2PdfExportRuntimeLayout(side, pipelineContext);
}

/**
 * PDF presentation offset (pt, bottom-origin) — V1 legacy ±8%; V2 from visualCompensation.
 */
export function resolvePdfExportRuntimePresentationOffsetY(
  side: Side,
  referenceHeightPt: number,
  pipelineContext?: ExportPipelineContext,
): number {
  if (
    !pipelineContext ||
    pipelineContext.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1
  ) {
    return resolveProductPreviewVisualCompensationPdfOffsetY(
      side,
      referenceHeightPt,
    );
  }

  const { offsetYPercent } = pipelineContext.visualCompensation;
  return -(offsetYPercent / 100) * referenceHeightPt;
}

/**
 * Map runtime layout to PDF placement — delegates mapDesignerLayoutToPdf only.
 */
export function resolvePdfExportRuntimePlacement(
  side: Side,
  panelArea: PdfMockupContentAreaPt,
  pipelineContext?: ExportPipelineContext,
): DesignerPdfRenderPlacement {
  const { mapDesignerLayoutToPdf } = getDesignerLayoutDelegates();
  const layout = resolvePdfExportRuntimeLayout(side, pipelineContext);
  return mapDesignerLayoutToPdf(layout, panelArea);
}

function toLayoutRect(layout: DesignerPreviewLayout): PdfExportRuntimeLayoutRect {
  return {
    leftPx: layout.printArea.leftPx,
    topPx: layout.printArea.topPx,
    widthPx: layout.printArea.widthPx,
    heightPx: layout.printArea.heightPx,
  };
}

function isPdfRuntimeCompareEnabled(): boolean {
  return process.env.EXPORT_PRODUCT_RUNTIME_COMPARE === "true";
}

export function buildPdfExportRuntimeCompareLog(
  side: Side,
  pipelineContext?: ExportPipelineContext,
  referenceHeightPt: number = PDF_RUNTIME_COMPARE_REFERENCE_HEIGHT_PT,
): PdfExportRuntimeCompareLog {
  const v1Context = resolvePdfExportPipelineContext({
    side,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
  });
  const v2Context = resolvePdfExportPipelineContext({
    side,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });

  const v1Layout = resolvePdfExportRuntimeLayout(side, v1Context);
  const v2Layout = resolvePdfExportRuntimeLayout(side, v2Context);

  const v1PresentationOffsetY = resolvePdfExportRuntimePresentationOffsetY(
    side,
    referenceHeightPt,
    v1Context,
  );
  const v2PresentationOffsetY = resolvePdfExportRuntimePresentationOffsetY(
    side,
    referenceHeightPt,
    v2Context,
  );

  return {
    side,
    v1: {
      printArea: toLayoutRect(v1Layout),
      collarBottomPx: v1Layout.collarBottomPx,
      presentationOffsetYPt: v1PresentationOffsetY,
    },
    v2: {
      printArea: toLayoutRect(v2Layout),
      collarBottomPx: v2Layout.collarBottomPx,
      presentationOffsetYPt: v2PresentationOffsetY,
    },
    delta: {
      printAreaTopPx: v2Layout.printArea.topPx - v1Layout.printArea.topPx,
      collarBottomPx: v2Layout.collarBottomPx - v1Layout.collarBottomPx,
      presentationOffsetYPt: v2PresentationOffsetY - v1PresentationOffsetY,
    },
  };
}

/**
 * Shadow runtime — V1 vs V2 PDF placement when EXPORT_PRODUCT_RUNTIME_COMPARE=true.
 * Does not affect PDF output.
 */
export function maybeLogPdfExportRuntimeCompare(params: {
  side: Side;
  pipelineContext?: ExportPipelineContext;
  referenceHeightPt?: number;
}): void {
  if (!isPdfRuntimeCompareEnabled()) return;

  const log = buildPdfExportRuntimeCompareLog(
    params.side,
    params.pipelineContext,
    params.referenceHeightPt,
  );

  console.info("[EXPORT_PRODUCT_RUNTIME_COMPARE] PDF Export Runtime", {
    side: params.side,
    activeVersion: params.pipelineContext?.geometryVersion ?? "v1",
    v1PrintArea: log.v1.printArea,
    v2PrintArea: log.v2.printArea,
    delta: log.delta,
    v1PresentationOffsetYPt: log.v1.presentationOffsetYPt,
    v2PresentationOffsetYPt: log.v2.presentationOffsetYPt,
  });
}
