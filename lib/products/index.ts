export type {
  ProductAssetDescriptor,
  ProductCalibration,
  ProductCalibrationRect,
  ProductCatalogItem,
  ProductCategory,
  ProductColorOption,
  ProductFabricInfo,
  ProductPreviewAsset,
  ProductPrintAreaCm,
  ProductProfile,
  ProductRecord,
  ProductSafeAreaCm,
  ProductSideSlug,
  ProductValidationIssue,
  ProductValidationResult,
} from "./product-types";

export {
  checkAssetExists,
  clearProductLoaderCache,
  fetchProductCalibrationFile,
  fetchProductCatalog,
  fetchProductProfile,
  findPreviewAsset,
  getCachedProductProfile,
  productCalibrationUrl,
  productProfileUrl,
  productRootPath,
  resolveProductAssetUrl,
  resolveRegistryGarmentAssetUrl,
} from "./product-loader";

export {
  validateProduct,
  validateProductAssets,
  validateProductCalibration,
  validateProductProfile,
} from "./product-validator";

export {
  clearProductLoaderCache as clearRegistryCache,
  getAssets,
  getCalibration,
  getProduct,
  getProductAssetUrl,
  getProductCalibrationUrl,
  getProductProfile,
  getProducts,
  validateProductRegistry,
} from "./product-registry";
