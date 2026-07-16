import {
  getProductCalibrationUrl,
  getProductProfile,
  getProducts,
  getProductAssetUrl,
} from "@/lib/products/product-registry";
import type {
  GarmentColorSlug,
  ProductSide,
} from "@/lib/render/render-types";

export async function listProducts() {
  const catalog = await getProducts();
  return Promise.all(
    catalog.map(async (item) => {
      const profile = await getProductProfile(item.code);
      return {
        code: item.code,
        colors: profile.availableColors.map((color) => color.slug),
        sides: profile.availableSides,
        name: item.name,
        brand: item.brand,
        enabled: item.enabled,
      };
    }),
  );
}

export async function resolveAssetImageUrl(
  productCode: string,
  color: GarmentColorSlug,
  side: ProductSide,
): Promise<string> {
  return getProductAssetUrl(productCode, side, color);
}

export function resolveCalibrationUrl(productCode: string): string {
  return getProductCalibrationUrl(productCode);
}

export function clearAssetLibraryCache(): void {
  // Delegated to Product Registry loader cache when needed.
}
