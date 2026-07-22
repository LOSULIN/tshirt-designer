/**
 * Artwork Export Runtime Adapter — Phase 71.1.
 *
 * Resolves artwork export geometry from ExportPipelineContext.
 * V1 delegates legacy bbox + canvas spec; V2 reads snapshot via pipelineContext only.
 * Does not call Builder, Factory Anchor, or Calibration.
 */

import type { Side } from "@/lib/constants";
import type {
  FactoryArtworkBBox,
} from "@/lib/export-artwork-factory";
import {
  cmToFactoryExportPx,
  resolveFactoryExportDpi,
} from "@/lib/export-artwork-factory";
import type { ExportPipelineContext } from "./export-pipeline-context";
import { resolveExportPipelineContext } from "./export-pipeline-context";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";
import type { GeometryV2Rect } from "./types";

export interface ArtworkExportCanvasSpec {
  widthPx: number;
  heightPx: number;
  exportDpi: number;
}

export interface ArtworkExportRuntimeGeometry {
  artworkStage?: GeometryV2Rect;
  safeArea?: GeometryV2Rect;
  bbox: FactoryArtworkBBox;
  exportCanvas: ArtworkExportCanvasSpec;
  geometryVersion: DesignerGeometryVersion;
}

export interface ArtworkExportDpiInput {
  maxEdgeCm: number;
  imageDesignerDpis: readonly number[];
}

export interface ArtworkExportRuntimeCompareLog {
  bbox: {
    v1: FactoryArtworkBBox;
    v2: FactoryArtworkBBox;
    delta: {
      x_cm: number;
      y_cm: number;
      width_cm: number;
      height_cm: number;
    };
  };
  exportCanvas: {
    v1: ArtworkExportCanvasSpec;
    v2: ArtworkExportCanvasSpec;
    delta: {
      widthPx: number;
      heightPx: number;
      exportDpi: number;
    };
  };
  artworkStageV2?: GeometryV2Rect;
}

function resolveExportCanvasFromBounds(
  bbox: FactoryArtworkBBox,
  dpiInput: ArtworkExportDpiInput,
): ArtworkExportCanvasSpec {
  const exportDpi = resolveFactoryExportDpi(
    dpiInput.maxEdgeCm,
    dpiInput.imageDesignerDpis,
  );
  return {
    exportDpi,
    widthPx: cmToFactoryExportPx(bbox.width_cm, exportDpi),
    heightPx: cmToFactoryExportPx(bbox.height_cm, exportDpi),
  };
}

function resolveV1ArtworkExportRuntimeGeometry(
  artworkBounds: FactoryArtworkBBox,
  dpiInput: ArtworkExportDpiInput,
): ArtworkExportRuntimeGeometry {
  return {
    artworkStage: undefined,
    safeArea: undefined,
    bbox: artworkBounds,
    exportCanvas: resolveExportCanvasFromBounds(artworkBounds, dpiInput),
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
  };
}

function resolveV2ArtworkExportRuntimeGeometry(
  pipelineContext: ExportPipelineContext,
  artworkBounds: FactoryArtworkBBox,
  dpiInput: ArtworkExportDpiInput,
): ArtworkExportRuntimeGeometry {
  const geometry = pipelineContext.geometry;
  if (!geometry || !pipelineContext.snapshot) {
    throw new Error(
      "resolveArtworkExportRuntimeGeometry: V2 pipelineContext missing geometry/snapshot",
    );
  }

  return {
    artworkStage: geometry.artworkStage,
    safeArea: geometry.safeArea,
    bbox: artworkBounds,
    exportCanvas: resolveExportCanvasFromBounds(artworkBounds, dpiInput),
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  };
}

/**
 * Artwork export geometry — engine render input.
 * V1: legacy bbox + canvas; V2: stage/safeArea from pipelineContext (no recompute).
 */
export function resolveArtworkExportRuntimeGeometry(
  pipelineContext: ExportPipelineContext | undefined,
  artworkBounds: FactoryArtworkBBox,
  dpiInput: ArtworkExportDpiInput,
): ArtworkExportRuntimeGeometry {
  if (
    !pipelineContext ||
    pipelineContext.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1
  ) {
    return resolveV1ArtworkExportRuntimeGeometry(artworkBounds, dpiInput);
  }

  return resolveV2ArtworkExportRuntimeGeometry(
    pipelineContext,
    artworkBounds,
    dpiInput,
  );
}

function isExportRuntimeCompareEnabled(): boolean {
  return process.env.EXPORT_RUNTIME_COMPARE === "true";
}

function buildArtworkExportRuntimeCompareLog(
  side: Side,
  pipelineContext: ExportPipelineContext | undefined,
  artworkBounds: FactoryArtworkBBox,
  dpiInput: ArtworkExportDpiInput,
): ArtworkExportRuntimeCompareLog {
  const v1 = resolveV1ArtworkExportRuntimeGeometry(artworkBounds, dpiInput);
  const v2Context =
    pipelineContext?.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2
      ? pipelineContext
      : resolveExportPipelineContext({
          side,
          surface: "png",
          geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
        });
  const v2 = resolveV2ArtworkExportRuntimeGeometry(
    v2Context,
    artworkBounds,
    dpiInput,
  );

  return {
    bbox: {
      v1: v1.bbox,
      v2: v2.bbox,
      delta: {
        x_cm: v2.bbox.x_cm - v1.bbox.x_cm,
        y_cm: v2.bbox.y_cm - v1.bbox.y_cm,
        width_cm: v2.bbox.width_cm - v1.bbox.width_cm,
        height_cm: v2.bbox.height_cm - v1.bbox.height_cm,
      },
    },
    exportCanvas: {
      v1: v1.exportCanvas,
      v2: v2.exportCanvas,
      delta: {
        widthPx: v2.exportCanvas.widthPx - v1.exportCanvas.widthPx,
        heightPx: v2.exportCanvas.heightPx - v1.exportCanvas.heightPx,
        exportDpi: v2.exportCanvas.exportDpi - v1.exportCanvas.exportDpi,
      },
    },
    artworkStageV2: v2.artworkStage,
  };
}

/**
 * Shadow runtime — logs V1 vs V2 adapter output when EXPORT_RUNTIME_COMPARE=true.
 * Does not affect render output.
 */
export function maybeLogArtworkExportRuntimeCompare(params: {
  side: Side;
  pipelineContext?: ExportPipelineContext;
  artworkBounds: FactoryArtworkBBox;
  dpiInput: ArtworkExportDpiInput;
}): void {
  if (!isExportRuntimeCompareEnabled()) return;

  const log = buildArtworkExportRuntimeCompareLog(
    params.side,
    params.pipelineContext,
    params.artworkBounds,
    params.dpiInput,
  );

  console.info("[EXPORT_RUNTIME_COMPARE] Artwork Export Runtime", {
    side: params.side,
    bboxDelta: log.bbox.delta,
    exportCanvasDelta: log.exportCanvas.delta,
    artworkStageV2: log.artworkStageV2,
  });
}

export function buildArtworkExportRuntimeCompareLogForTest(
  side: Side,
  pipelineContext: ExportPipelineContext | undefined,
  artworkBounds: FactoryArtworkBBox,
  dpiInput: ArtworkExportDpiInput,
): ArtworkExportRuntimeCompareLog {
  return buildArtworkExportRuntimeCompareLog(
    side,
    pipelineContext,
    artworkBounds,
    dpiInput,
  );
}
