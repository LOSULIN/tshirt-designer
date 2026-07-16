/**
 * Product Registry — client-friendly facade over lib/products.
 */
export {
  clearProductLoaderCache,
  getAssets,
  getCalibration,
  getProduct,
  getProductAssetUrl,
  getProductCalibrationUrl,
  getProductProfile,
  getProducts,
  validateProductRegistry,
} from "@/lib/products/product-registry";

export { clearProductLoaderCache as clearRegistryCache } from "@/lib/products/product-loader";

export type {
  ProductAssetDescriptor,
  ProductCalibration,
  ProductCatalogItem,
  ProductProfile,
  ProductRecord,
  ProductValidationResult,
} from "@/lib/products/product-types";
