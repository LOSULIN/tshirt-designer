/**
 * Product Platform — shared types (Product Registry).
 * Independent from Designer canvas / coordinate / layer runtimes.
 */

export type ProductCategory =
  | "t-shirt"
  | "hoodie"
  | "polo"
  | "tote-bag"
  | string;

export type ProductSideSlug = "front" | "back";

export interface ProductCatalogItem {
  code: string;
  name: string;
  brand: string;
  enabled: boolean;
}

export interface ProductPrintAreaCm {
  widthCm: number;
  heightCm: number;
}

export interface ProductSafeAreaCm {
  widthCm: number;
  heightCm: number;
  referenceSize?: string;
}

export interface ProductColorOption {
  slug: string;
  label: string;
  hex?: string;
}

/** Garment mockup asset paths per use-case (preview UI vs product export). */
export interface ProductAssetPaths {
  preview: string;
  export: string;
}

export interface ProductGarmentAsset {
  side: ProductSideSlug;
  color: string;
  assets: ProductAssetPaths;
  /** @deprecated Use assets.preview — kept for legacy profile.json */
  path?: string;
}

/** @deprecated Use ProductGarmentAsset */
export type ProductPreviewAsset = ProductGarmentAsset;

export interface ProductAssetReferenceSize {
  width: number;
  height: number;
}

export interface ProductFabricInfo {
  material: string;
  weight?: string;
  notes?: string;
}

export interface ProductProfile {
  code: string;
  brand: string;
  displayName: string;
  category: ProductCategory;
  printArea: Partial<Record<ProductSideSlug, ProductPrintAreaCm>>;
  safeArea: Partial<Record<ProductSideSlug, ProductSafeAreaCm>>;
  availableSides: ProductSideSlug[];
  availableColors: ProductColorOption[];
  availableSizes: string[];
  fabricInfo: ProductFabricInfo;
  thumbnail: string;
  previewAssets: ProductGarmentAsset[];
  calibrationFile: string;
  /** Mockup-only visual scale JSON (default visual-compensation.json). */
  visualCompensationFile?: string;
  /** Calibration.json pixel basis (typically preview garment natural size). */
  assetReferenceSize?: ProductAssetReferenceSize;
}

export interface ProductCalibrationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ProductCalibration {
  front?: ProductCalibrationRect;
  back?: ProductCalibrationRect;
}

export interface ProductAssetDescriptor {
  side: ProductSideSlug;
  color: string;
  url: string;
  relativePath: string;
}

export interface ProductRecord {
  catalog: ProductCatalogItem;
  profile: ProductProfile;
}

export interface ProductValidationIssue {
  level: "error" | "warning";
  message: string;
}

export interface ProductValidationResult {
  code: string;
  valid: boolean;
  issues: ProductValidationIssue[];
  calibrationReady: boolean;
  renderReady: boolean;
}
