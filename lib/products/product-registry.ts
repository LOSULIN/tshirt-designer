import {
  fetchProductCalibrationFile,
  fetchProductCatalog,
  fetchProductProfile,
  productCalibrationUrl,
  resolveGarmentAssetRelativePath,
  resolveProductAssetUrl,
  resolveRegistryGarmentAssetUrl,
} from "./product-loader";
import { validateProduct } from "./product-validator";
import type {
  ProductAssetDescriptor,
  ProductCalibration,
  ProductCatalogItem,
  ProductProfile,
  ProductRecord,
  ProductSideSlug,
  ProductValidationResult,
} from "./product-types";

export async function getProducts(
  options?: { enabledOnly?: boolean },
): Promise<ProductCatalogItem[]> {
  const catalog = await fetchProductCatalog();
  if (options?.enabledOnly === false) return catalog;
  return catalog.filter((item) => item.enabled);
}

export async function getProduct(code: string): Promise<ProductRecord | null> {
  const catalog = await fetchProductCatalog();
  const catalogItem = catalog.find((item) => item.code === code);
  if (!catalogItem) return null;
  const profile = await fetchProductProfile(code);
  return { catalog: catalogItem, profile };
}

export async function getProductProfile(code: string): Promise<ProductProfile> {
  return fetchProductProfile(code);
}

export async function getCalibration(code: string): Promise<ProductCalibration> {
  const profile = await fetchProductProfile(code);
  return fetchProductCalibrationFile(code, profile.calibrationFile);
}

export async function getAssets(code: string): Promise<ProductAssetDescriptor[]> {
  const profile = await fetchProductProfile(code);
  return profile.previewAssets.map((asset) => {
    const relativePath = resolveGarmentAssetRelativePath(asset, "preview");
    return {
      side: asset.side,
      color: asset.color,
      relativePath,
      url: resolveProductAssetUrl(code, relativePath),
    };
  });
}

export function getProductCalibrationUrl(code: string): string {
  return productCalibrationUrl(code);
}

export async function getProductAssetUrl(
  code: string,
  side: ProductSideSlug,
  color: string,
): Promise<string> {
  return resolveRegistryGarmentAssetUrl(code, side, color);
}

export async function validateProductRegistry(
  code: string,
): Promise<ProductValidationResult> {
  return validateProduct(code);
}

export { clearProductLoaderCache } from "./product-loader";
