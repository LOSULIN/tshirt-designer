export type {
  CalibrationPrintReference,
  CalibrationRect,
  CalibrationSideMapping,
  CalibrationSideValue,
  ComposeArtworkInput,
  ComposeArtworkResult,
  FineCalibrationMapping,
  GarmentColorSlug,
  ProductAssetCatalog,
  ProductCalibration,
  ProductCatalogEntry,
  ProductSide,
  RenderAsset,
  RenderEngineInput,
  RenderResult,
  VisualAdjustment,
} from "./render-types";

export {
  fetchProductCalibration,
  getCalibrationRectForSide,
  getDesignerPrintAreaForSide,
  getEditableProductRectForSide,
  getProductPrintAreaForSide,
  isCalibrationRectActive,
  parseProductCalibration,
  serializeProductCalibration,
} from "./calibration";

export { assetImagePath, loadAsset } from "./asset-loader";
export { composeArtwork } from "./compose-artwork";
export { composeProductMockup } from "./product-mockup-compose";
export {
  computeCoordinateMapping,
  createCalibrationSideMapping,
  isCalibrationSideMapping,
  mapDesignerPointToProduct,
  mapDesignerRectToProduct,
  resolveCalibrationReferences,
  resolveMappedArtworkPlacement,
} from "./coordinate-mapping";
export type { CoordinateMappingTransform, MappedArtworkPlacement } from "./coordinate-mapping";
export {
  MAPPING_VALIDATION_TOLERANCE_PX,
  computeExpectedProductBounds,
  validateMappingAlignment,
} from "./coordinate-mapping-validation";
export type {
  MappingAlignmentMetrics,
  MappingAlignmentResult,
} from "./coordinate-mapping-validation";
export {
  DESIGNER_TEMPLATE_CANVAS,
  getDefaultDesignerPrintAreaRect,
} from "./designer-template-reference";
export {
  DEFAULT_FINE_CALIBRATION,
  applyFineCalibration,
  getFineCalibrationForSide,
  mergeFineCalibrationSide,
  normalizeFineCalibrationMapping,
  parseFineCalibrationMapping,
  resolveFinalArtworkPlacement,
} from "./fine-calibration";
export {
  DEFAULT_VISUAL_ADJUSTMENT,
  applyVisualAdjustment,
  getVisualAdjustmentForSide,
  mergeVisualAdjustmentSide,
  normalizeVisualAdjustment,
  parseVisualAdjustment,
  resolveProductMockupPlacement,
  resolveProductMockupPlacementWithOffset,
} from "./visual-adjustment";
export {
  MOCKUP_ANATOMY_COLLAR_Y,
  MOCKUP_VISUAL_COMPARE_OFFSETS,
  MOCKUP_VISUAL_OFFSET_PRESETS,
  MOCKUP_VISUAL_OFFSET_STEP,
  UA35001_RECOMMENDED_VISUAL_OFFSET_Y,
  buildMockupVisualCalibrationReport,
} from "./mockup-visual-calibration";
export {
  clampCalibrationRect,
  createDefaultCalibrationRect,
  formatCalibrationRect,
  mergeCalibrationSide,
  moveCalibrationRect,
  resizeCalibrationRect,
  resolveEditableCalibrationRect,
} from "./calibration-rect";
export type { ImageBounds, ResizeHandle } from "./calibration-rect";

export { createSampleArtworkCanvas } from "./sample-artwork";
export {
  RENDER_TEST_CASES,
  RENDER_VALIDATION_COLOR,
  RENDER_VALIDATION_PRODUCT,
  RENDER_VALIDATION_SIDE,
  getRenderTestCase,
} from "./render-testcases";
export type { RenderTestCaseDefinition, RenderValidationCheck, TestArtworkContext } from "./render-testcases";
export {
  createDifferenceOverlay,
  resolveValidationCalibration,
  summarizeValidation,
  validateRenderTestCase,
} from "./render-validation";
export type {
  RenderValidationOutcome,
  RenderValidationSummary,
  ValidationDetail,
  ValidationStatus,
} from "./render-validation";
