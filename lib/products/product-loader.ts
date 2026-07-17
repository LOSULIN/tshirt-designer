import type {
  ProductCalibration,
  ProductCatalogItem,
  ProductPreviewAsset,
  ProductProfile,
  ProductSideSlug,
} from "./product-types";

const CATALOG_URL = "/products/catalog.json";

const profileCache = new Map<string, ProductProfile>();
const calibrationCache = new Map<string, ProductCalibration>();
let catalogCache: ProductCatalogItem[] | null = null;

const isDevelopment = process.env.NODE_ENV === "development";

export function productRootPath(code: string): string {
  return `/products/${code}`;
}

export function productProfileUrl(code: string): string {
  return `${productRootPath(code)}/profile.json`;
}

export function productCalibrationUrl(code: string): string {
  return `${productRootPath(code)}/calibration.json`;
}

export function resolveProductAssetUrl(
  code: string,
  relativePath: string,
): string {
  const normalized = relativePath.replace(/^\//, "");
  return `${productRootPath(code)}/${normalized}`;
}

export function findPreviewAsset(
  profile: ProductProfile,
  side: ProductSideSlug,
  color: string,
): ProductPreviewAsset | undefined {
  return profile.previewAssets.find(
    (asset) => asset.side === side && asset.color === color,
  );
}

/**
 * Canonical garment asset URL — resolved from profile.previewAssets only.
 * Do not concatenate asset paths outside the registry.
 */
export async function resolveRegistryGarmentAssetUrl(
  code: string,
  side: ProductSideSlug,
  color: string,
): Promise<string> {
  const profile = await fetchProductProfile(code);
  const asset = findPreviewAsset(profile, side, color);
  if (!asset) {
    throw new Error(
      `Product ${code}: previewAssets 缺少 ${side}/${color} 素材定義`,
    );
  }
  return resolveProductAssetUrl(code, asset.path);
}

export async function fetchProductCatalog(): Promise<ProductCatalogItem[]> {
  if (catalogCache) return catalogCache;
  const response = await fetch(CATALOG_URL);
  if (!response.ok) {
    throw new Error(`Failed to load product catalog: ${response.status}`);
  }
  catalogCache = (await response.json()) as ProductCatalogItem[];
  return catalogCache;
}

export async function fetchProductProfile(code: string): Promise<ProductProfile> {
  if (isDevelopment) {
    clearProductLoaderCache();
  } else {
    const cached = profileCache.get(code);
    if (cached) return cached;
  }

  const response = await fetch(productProfileUrl(code), {
    cache: isDevelopment ? "no-store" : "default",
  });
  if (!response.ok) {
    throw new Error(`Failed to load profile for ${code}: ${response.status}`);
  }
  const profile = (await response.json()) as ProductProfile;
  if (!isDevelopment) {
    profileCache.set(code, profile);
  }
  return profile;
}

export async function fetchProductCalibrationFile(
  code: string,
  calibrationFile?: string,
): Promise<ProductCalibration> {
  if (!isDevelopment) {
    const cached = calibrationCache.get(code);
    if (cached) return cached;
  }
  const profile = calibrationFile
    ? null
    : await fetchProductProfile(code).catch(() => null);
  const fileName = calibrationFile ?? profile?.calibrationFile ?? "calibration.json";
  const url = resolveProductAssetUrl(code, fileName);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load calibration for ${code}: ${response.status}`);
  }
  const calibration = (await response.json()) as ProductCalibration;
  if (!isDevelopment) {
    calibrationCache.set(code, calibration);
  }
  return calibration;
}

export async function checkAssetExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

export function clearProductLoaderCache(): void {
  catalogCache = null;
  profileCache.clear();
  calibrationCache.clear();
}

export function getCachedProductProfile(code: string): ProductProfile | undefined {
  return profileCache.get(code);
}
