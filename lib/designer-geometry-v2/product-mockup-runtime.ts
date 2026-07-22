/**
 * Product Mockup Runtime Adapter — Phase 71.2.
 *
 * Resolves product photo placement from ExportPipelineContext.
 * V1 delegates calibration placement; V2 reads pipelineContext.photoBridge only.
 */

import type { PhotoBridgeRect } from "@/lib/presentation/product-photo-bridge";
import {
  resolveProductPreviewVisualCompensation,
  type ProductPreviewVisualCompensationAxis,
} from "@/lib/presentation/visual-compensation";
import {
  PRODUCT_PLACEMENT_BASELINE_SIZE,
  resolveProductMockupPlacementForGarmentSize,
} from "@/lib/render/product-placement-scale";
import type {
  CalibrationRect,
  ProductCalibration,
  ProductSide,
} from "@/lib/render/render-types";
import type { ExportPipelineContext, GeometryRuntimePhotoBridge } from "./export-pipeline-context";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";

export interface ProductMockupRuntimeProductInput {
  calibration: ProductCalibration;
  side: ProductSide;
  mockupVisualScale: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface ProductMockupRuntimePlacement {
  photoArtworkStage?: PhotoBridgeRect;
  placementRect: CalibrationRect | null;
  visualCompensation: ProductPreviewVisualCompensationAxis;
  photoBridge?: GeometryRuntimePhotoBridge;
  scale: number;
  geometryVersion: DesignerGeometryVersion;
}

export interface ProductMockupRuntimeCompareLog {
  legacyPlacement: CalibrationRect | null;
  runtimePlacement: CalibrationRect | null;
  delta: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  visualCompensation: ProductPreviewVisualCompensationAxis;
  photoBridge?: GeometryRuntimePhotoBridge;
}

export function photoBridgeRectToCalibrationRect(
  stage: PhotoBridgeRect,
  canvasWidth: number,
  canvasHeight: number,
): CalibrationRect {
  return {
    x: Math.round((stage.leftPercent / 100) * canvasWidth),
    y: Math.round((stage.topPercent / 100) * canvasHeight),
    width: Math.round((stage.widthPercent / 100) * canvasWidth),
    height: Math.round((stage.heightPercent / 100) * canvasHeight),
  };
}

export function applyRuntimeVisualCompensationToRect(
  rect: CalibrationRect,
  compensation: ProductPreviewVisualCompensationAxis,
  referenceWidth: number,
  referenceHeight: number,
): CalibrationRect {
  const { offsetXPercent, offsetYPercent } = compensation;
  if (offsetXPercent === 0 && offsetYPercent === 0) {
    return rect;
  }

  const dx = (offsetXPercent / 100) * referenceWidth;
  const dy = (offsetYPercent / 100) * referenceHeight;

  return {
    x: rect.x + dx,
    y: rect.y + dy,
    width: rect.width,
    height: rect.height,
  };
}

function resolveLegacyPlacementRect(
  calibration: ProductCalibration,
  side: ProductSide,
  garmentSize: string,
): CalibrationRect | null {
  return resolveProductMockupPlacementForGarmentSize(
    calibration,
    side,
    garmentSize,
  );
}

function resolveV1ProductMockupRuntimePlacement(
  pipelineContext: ExportPipelineContext | undefined,
  product: ProductMockupRuntimeProductInput,
  garmentSize: string,
): ProductMockupRuntimePlacement {
  const placementRect = resolveLegacyPlacementRect(
    product.calibration,
    product.side,
    garmentSize,
  );
  const visualCompensation =
    pipelineContext?.visualCompensation ??
    resolveProductPreviewVisualCompensation(product.side);

  return {
    photoArtworkStage: undefined,
    placementRect,
    visualCompensation,
    photoBridge: undefined,
    scale: product.mockupVisualScale,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
  };
}

function resolveV2ProductMockupRuntimePlacement(
  pipelineContext: ExportPipelineContext,
  product: ProductMockupRuntimeProductInput,
): ProductMockupRuntimePlacement {
  const photoBridge = pipelineContext.photoBridge;
  if (!photoBridge?.photoArtworkStage) {
    return resolveV1ProductMockupRuntimePlacement(
      pipelineContext,
      product,
      photoBridge?.size ?? PRODUCT_PLACEMENT_BASELINE_SIZE,
    );
  }

  const placementRect = photoBridgeRectToCalibrationRect(
    photoBridge.photoArtworkStage,
    product.canvasWidth,
    product.canvasHeight,
  );

  return {
    photoArtworkStage: photoBridge.photoArtworkStage,
    placementRect,
    visualCompensation: pipelineContext.visualCompensation,
    photoBridge,
    scale: 1,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  };
}

/**
 * Product mockup placement — engine render input.
 * V1: calibration placement; V2: photoBridge from pipelineContext (delegate only).
 */
export function resolveProductMockupRuntimePlacement(
  pipelineContext: ExportPipelineContext | undefined,
  product: ProductMockupRuntimeProductInput,
  size: string,
  _artworkRect?: CalibrationRect | null,
): ProductMockupRuntimePlacement {
  void _artworkRect;
  const garmentSize = size || PRODUCT_PLACEMENT_BASELINE_SIZE;

  if (
    !pipelineContext ||
    pipelineContext.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1
  ) {
    return resolveV1ProductMockupRuntimePlacement(
      pipelineContext,
      product,
      garmentSize,
    );
  }

  return resolveV2ProductMockupRuntimePlacement(pipelineContext, product);
}

function isProductRuntimeCompareEnabled(): boolean {
  return process.env.EXPORT_PRODUCT_RUNTIME_COMPARE === "true";
}

function buildProductMockupRuntimeCompareLog(
  pipelineContext: ExportPipelineContext | undefined,
  product: ProductMockupRuntimeProductInput,
  size: string,
): ProductMockupRuntimeCompareLog {
  const garmentSize = size || PRODUCT_PLACEMENT_BASELINE_SIZE;
  const legacyPlacement = resolveLegacyPlacementRect(
    product.calibration,
    product.side,
    garmentSize,
  );
  const runtime = resolveProductMockupRuntimePlacement(
    pipelineContext,
    product,
    size,
  );

  const delta =
    legacyPlacement && runtime.placementRect
      ? {
          x: runtime.placementRect.x - legacyPlacement.x,
          y: runtime.placementRect.y - legacyPlacement.y,
          width: runtime.placementRect.width - legacyPlacement.width,
          height: runtime.placementRect.height - legacyPlacement.height,
        }
      : null;

  return {
    legacyPlacement,
    runtimePlacement: runtime.placementRect,
    delta,
    visualCompensation: runtime.visualCompensation,
    photoBridge: runtime.photoBridge,
  };
}

/**
 * Shadow runtime — logs legacy vs runtime placement when EXPORT_PRODUCT_RUNTIME_COMPARE=true.
 * Does not affect render output.
 */
export function maybeLogProductMockupRuntimeCompare(params: {
  pipelineContext?: ExportPipelineContext;
  product: ProductMockupRuntimeProductInput;
  size: string;
}): void {
  if (!isProductRuntimeCompareEnabled()) return;

  const log = buildProductMockupRuntimeCompareLog(
    params.pipelineContext,
    params.product,
    params.size,
  );

  console.info("[EXPORT_PRODUCT_RUNTIME_COMPARE] Product Mockup Runtime", {
    side: params.product.side,
    size: params.size,
    geometryVersion: params.pipelineContext?.geometryVersion ?? "v1",
    legacyPlacement: log.legacyPlacement,
    runtimePlacement: log.runtimePlacement,
    delta: log.delta,
    visualCompensation: log.visualCompensation,
    photoBridgeStage: log.photoBridge?.photoArtworkStage,
  });
}

export function buildProductMockupRuntimeCompareLogForTest(
  pipelineContext: ExportPipelineContext | undefined,
  product: ProductMockupRuntimeProductInput,
  size: string,
): ProductMockupRuntimeCompareLog {
  return buildProductMockupRuntimeCompareLog(pipelineContext, product, size);
}
