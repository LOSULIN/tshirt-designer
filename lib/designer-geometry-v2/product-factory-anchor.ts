/**
 * Product Factory Anchor — official per-product geometry definition (Phase 70.4).
 *
 * Runtime SSOT for factory placement. Builder / alpha analysis is fallback only
 * when a product has no registered anchor.
 */

import type { Side } from "@/lib/constants";
import {
  GEOMETRY_V2_CANVAS_HEIGHT_PX,
  GEOMETRY_V2_CANVAS_WIDTH_PX,
  GEOMETRY_V2_FACTORY_PRINT_AREA_CM,
  GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM,
  GEOMETRY_V2_FACTORY_SAFE_AREA_CM,
  GEOMETRY_V2_PRINT_PX_PER_CM,
  GEOMETRY_V2_PRODUCT_CODE,
} from "./constants";
import type {
  ProductMasterGeometry,
  ProductMasterGeometrySide,
} from "./product-master-profile";
import { PRODUCT_MASTER_PRODUCT_CODE } from "./product-master-profile";
import type { GeometryRuntimeSnapshot } from "./shadow-runtime-types";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

export interface ProductFactoryAnchorCollar {
  x: number;
  y: number;
  neckWidthPx: number;
}

export interface ProductFactoryAnchorShoulder {
  scanY: number;
  widthPx: number;
}

/** Silhouette reference for debug overlay — not used for factory placement. */
export interface ProductFactoryAnchorGarmentReference {
  garmentWidthPx: number;
  garmentHeightPx: number;
  shoulderWidthPx: number;
  centerPoint: GeometryV2Point;
  hem: GeometryV2Point;
  alphaBoundingBox: GeometryV2Rect;
}

export interface ProductFactoryAnchorSide {
  collarBottom: ProductFactoryAnchorCollar;
  /** Front shoulder scan line — optional on back. */
  shoulder?: ProductFactoryAnchorShoulder;
  /** Official factory placement origin (collar hem for UA35001). */
  factoryOrigin: GeometryV2Point;
  garmentReference: ProductFactoryAnchorGarmentReference;
}

export interface ProductFactoryAnchor {
  productCode: string;
  source: "official-product-definition";
  canvas: { width: number; height: number };
  front: ProductFactoryAnchorSide;
  back: ProductFactoryAnchorSide;
}

/**
 * UA35001 — official factory anchor (UA product photography + 7cm/5cm print spec).
 * Values calibrated Phase 70.3; no longer derived from builder collar offset.
 */
export const UA35001_PRODUCT_FACTORY_ANCHOR: ProductFactoryAnchor = {
  productCode: GEOMETRY_V2_PRODUCT_CODE,
  source: "official-product-definition",
  canvas: {
    width: GEOMETRY_V2_CANVAS_WIDTH_PX,
    height: GEOMETRY_V2_CANVAS_HEIGHT_PX,
  },
  front: {
    collarBottom: { x: 512, y: 416, neckWidthPx: 286 },
    shoulder: { scanY: 348, widthPx: 578.9 },
    factoryOrigin: { x: 512, y: 416 },
    garmentReference: {
      garmentWidthPx: 981.5,
      garmentHeightPx: 998,
      shoulderWidthPx: 578.9,
      centerPoint: { x: 511.95, y: 772.9 },
      hem: { x: 511.95, y: 1270.9 },
      alphaBoundingBox: {
        left: 21.2,
        top: 273.9,
        width: 981.5,
        height: 998,
      },
    },
  },
  back: {
    collarBottom: { x: 513, y: 327, neckWidthPx: 286 },
    factoryOrigin: { x: 513, y: 327 },
    garmentReference: {
      garmentWidthPx: 981.5,
      garmentHeightPx: 1020.3,
      shoulderWidthPx: 577.1,
      centerPoint: { x: 512.95, y: 775.95 },
      hem: { x: 512.95, y: 1285.1 },
      alphaBoundingBox: {
        left: 22.2,
        top: 265.8,
        width: 981.5,
        height: 1020.3,
      },
    },
  },
};

const PRODUCT_FACTORY_ANCHOR_REGISTRY: Record<string, ProductFactoryAnchor> = {
  [GEOMETRY_V2_PRODUCT_CODE]: UA35001_PRODUCT_FACTORY_ANCHOR,
};

function roundPx(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildPlacementRectFromFactoryOrigin(
  side: Side,
  factoryOrigin: GeometryV2Point,
  areaCm: { widthCm: number; heightCm: number },
): GeometryV2Rect {
  const pxPerCm = GEOMETRY_V2_PRINT_PX_PER_CM;
  const width = areaCm.widthCm * pxPerCm;
  const height = areaCm.heightCm * pxPerCm;
  const top =
    factoryOrigin.y + GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[side] * pxPerCm;
  const left = factoryOrigin.x - width / 2;
  return {
    left: roundPx(left),
    top: roundPx(top),
    width: roundPx(width),
    height: roundPx(height),
  };
}

export function hasProductFactoryAnchor(productCode: string): boolean {
  return productCode in PRODUCT_FACTORY_ANCHOR_REGISTRY;
}

export function resolveProductFactoryAnchor(
  productCode: string = GEOMETRY_V2_PRODUCT_CODE,
): ProductFactoryAnchor | null {
  return PRODUCT_FACTORY_ANCHOR_REGISTRY[productCode] ?? null;
}

export function resolvePrintTopPxFromFactoryOrigin(
  side: Side,
  factoryOriginY: number,
): number {
  return roundPx(
    factoryOriginY +
      GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[side] * GEOMETRY_V2_PRINT_PX_PER_CM,
  );
}

function buildProductMasterSideFromAnchor(
  anchor: ProductFactoryAnchor,
  side: Side,
): ProductMasterGeometrySide {
  const anchorSide = side === "front" ? anchor.front : anchor.back;
  const offsetCm = GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[side];
  const pxPerCm = GEOMETRY_V2_PRINT_PX_PER_CM;
  const factoryOrigin = {
    x: anchorSide.factoryOrigin.x,
    y: anchorSide.factoryOrigin.y,
    side,
    offsetCm,
    pxPerCm,
  };
  const ref = anchorSide.garmentReference;

  return {
    productCode: PRODUCT_MASTER_PRODUCT_CODE,
    side,
    canvas: { ...anchor.canvas },
    collarBottom: { ...anchorSide.collarBottom },
    factoryOrigin,
    artworkStage: buildPlacementRectFromFactoryOrigin(
      side,
      anchorSide.factoryOrigin,
      GEOMETRY_V2_FACTORY_PRINT_AREA_CM[side],
    ),
    safeArea: buildPlacementRectFromFactoryOrigin(
      side,
      anchorSide.factoryOrigin,
      GEOMETRY_V2_FACTORY_SAFE_AREA_CM[side],
    ),
    garmentWidthPx: ref.garmentWidthPx,
    garmentHeightPx: ref.garmentHeightPx,
    shoulderWidthPx: ref.shoulderWidthPx,
    centerPoint: { ...ref.centerPoint },
    hem: { ...ref.hem },
    alphaBoundingBox: { ...ref.alphaBoundingBox },
  };
}

/** Derive Product Master from official factory anchor (not builder calibration). */
export function buildProductMasterGeometryFromFactoryAnchor(
  anchor: ProductFactoryAnchor,
): ProductMasterGeometry {
  if (anchor.productCode !== PRODUCT_MASTER_PRODUCT_CODE) {
    throw new Error(
      `Factory anchor product ${anchor.productCode} does not match master ${PRODUCT_MASTER_PRODUCT_CODE}`,
    );
  }

  return {
    productCode: PRODUCT_MASTER_PRODUCT_CODE,
    version: 1,
    derivation: "product-factory-anchor",
    front: buildProductMasterSideFromAnchor(anchor, "front"),
    back: buildProductMasterSideFromAnchor(anchor, "back"),
  };
}

export function resolveProductMasterFromFactoryAnchor(
  productCode: string = GEOMETRY_V2_PRODUCT_CODE,
): ProductMasterGeometry | null {
  const anchor = resolveProductFactoryAnchor(productCode);
  if (!anchor) return null;
  return buildProductMasterGeometryFromFactoryAnchor(anchor);
}

export function productMasterGeometryToRuntimeSnapshot(
  side: Side,
  master: ProductMasterGeometry,
): GeometryRuntimeSnapshot {
  const m: ProductMasterGeometrySide =
    side === "front" ? master.front : master.back;
  return {
    version: "v2",
    side,
    collar: { x: m.collarBottom.x, y: m.collarBottom.y },
    factoryOrigin: { x: m.factoryOrigin.x, y: m.factoryOrigin.y },
    artworkStage: { ...m.artworkStage },
    safeArea: { ...m.safeArea },
    garmentWidth: m.garmentWidthPx,
    garmentHeight: m.garmentHeightPx,
    center: { ...m.centerPoint },
    hem: { ...m.hem },
  };
}

/**
 * V2 runtime snapshot — Factory Anchor first; frozen snapshot fallback when no anchor.
 */
export function resolveFactoryAnchorRuntimeSnapshot(
  side: Side,
  productCode: string = GEOMETRY_V2_PRODUCT_CODE,
): GeometryRuntimeSnapshot {
  const master = resolveProductMasterFromFactoryAnchor(productCode);
  if (master) {
    return productMasterGeometryToRuntimeSnapshot(side, master);
  }
  throw new Error(
    `No Product Factory Anchor for ${productCode} — register anchor or provide builder fallback snapshot`,
  );
}

export function getRegisteredProductFactoryAnchorCodes(): string[] {
  return Object.keys(PRODUCT_FACTORY_ANCHOR_REGISTRY);
}
