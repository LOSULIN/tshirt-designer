/**
 * Render Engine — shared types (calibration test phase).
 * Independent from Designer export / canvas / coordinate runtimes.
 */

import type { RenderQuality } from "@/lib/export/render-quality";

export type ProductSide = "front" | "back";

/** Garment color slug used in asset filenames (e.g. black, white). */
export type GarmentColorSlug = string;

export interface CalibrationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CalibrationPrintReference {
  printArea: CalibrationRect;
}

/** Fine tune applied after coordinate mapping (visual alignment). */
export interface FineCalibrationMapping {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

/** Mockup-only pixel offset after product reference (not factory / not artwork export). */
export interface VisualAdjustment {
  offsetX: number;
  offsetY: number;
}

/** Render Calibration 2.0 — designer template vs product asset print areas. */
export interface CalibrationSideMapping {
  designerReference: CalibrationPrintReference;
  productReference: CalibrationPrintReference;
  mapping?: FineCalibrationMapping;
  visualAdjustment?: VisualAdjustment;
}

export type CalibrationSideValue = CalibrationRect | CalibrationSideMapping;

/** Per-product calibration payload (public/products/{code}/calibration.json). */
export interface ProductCalibration {
  front?: CalibrationSideValue;
  back?: CalibrationSideValue;
}

export interface RenderAsset {
  productCode: string;
  color: GarmentColorSlug;
  side: ProductSide;
  imageUrl: string;
  image: CanvasImageSource;
  naturalWidth: number;
  naturalHeight: number;
  calibration: ProductCalibration;
  calibrationScale: number;
  /** Mockup-only artwork visual scale (default 1.0). */
  mockupVisualScale: number;
}

export interface ComposeArtworkInput {
  asset: RenderAsset;
  artwork: CanvasImageSource;
  artworkWidth: number;
  artworkHeight: number;
}

export interface ComposeArtworkResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface RenderEngineInput {
  productCode: string;
  color: GarmentColorSlug;
  side: ProductSide;
  artwork: CanvasImageSource;
  artworkWidth: number;
  artworkHeight: number;
  quality?: RenderQuality;
}

export interface RenderResult {
  productCode: string;
  color: GarmentColorSlug;
  side: ProductSide;
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
}

/** Catalog entry — legacy render helper; canonical catalog at public/products/catalog.json. */
export interface ProductCatalogEntry {
  code: string;
  colors: GarmentColorSlug[];
  sides: ProductSide[];
}

export interface ProductAssetCatalog {
  products: ProductCatalogEntry[];
}
