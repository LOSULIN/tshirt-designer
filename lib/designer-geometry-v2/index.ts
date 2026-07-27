/**
 * Designer Geometry V2 — public exports (foundation only; runtime remains V1).
 */

export {
  GEOMETRY_V2_PRODUCT_CODE,
  GEOMETRY_V2_CANVAS_WIDTH_PX,
  GEOMETRY_V2_CANVAS_HEIGHT_PX,
  GEOMETRY_V2_BASELINE_COLOR_SLUG,
  GEOMETRY_V2_BASELINE_SIZE,
  GEOMETRY_V2_COLOR_SLUGS,
  GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM,
  GEOMETRY_V2_FACTORY_PRINT_AREA_CM,
  GEOMETRY_V2_FACTORY_SAFE_AREA_CM,
  buildGeometryV2AssetRelativePath,
  buildGeometryV2AssetFileName,
} from "./constants";

export type { GeometryV2ColorSlug } from "./constants";

export {
  DESIGNER_GEOMETRY_VERSION,
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  getActiveDesignerGeometryVersion,
  isDesignerGeometryV1,
  isDesignerGeometryV2,
  isDesignerGeometryV2EnabledByDefault,
} from "./geometry-version";

export type { DesignerGeometryVersion } from "./geometry-version";

export {
  GEOMETRY_V1_REFERENCE,
  resolveGeometryV1ArtworkStagePx,
  resolveGeometryV1CollarAnchor,
} from "./geometry-v1-reference";

export {
  measureAlphaSilhouetteFromBuffer,
  deriveGeometryV2SilhouettePxPerCm,
  resolveGeometryV2PrintPxPerCm,
  resolveGeometryV2PrintAreaRects,
  assertGeometryV2Canvas,
} from "./measure-garment-alpha";

export {
  measureDesignerGeometryV2FromAsset,
  resolveDesignerGeometryV2,
} from "./resolve-designer-geometry-v2";

export {
  compareGeometryV1V2Baseline,
  formatGeometryV1V2Report,
} from "./compare-geometry-v1-v2";

export { buildGeometryProfileV2, buildGeometryProfileV2FromMeasurement } from "./geometry-builder";

export {
  deriveFactoryCollarBottom,
  deriveNeckMetrics,
  deriveShoulderMetrics,
  resolveFactoryOrigin,
  scanOpaqueSpanAtY,
} from "./factory-origin";

export {
  validateGeometryProfileV2,
  formatGeometryValidationReport,
} from "./geometry-validation";

export type {
  GeometryProfileV2,
  GeometryV2CollarBottom,
  GeometryV2FactoryOrigin,
  GeometryV2NeckMetrics,
  GeometryV2ShoulderMetrics,
  BuildGeometryProfileV2Input,
} from "./geometry-profile";

export type {
  GeometryValidationResult,
  GeometryValidationIssue,
} from "./geometry-validation";

export type {
  DesignerGeometryV2Profile,
  GeometryV2AlphaMeasurement,
  GeometryV2PrintAreaRects,
  GeometryV2Point,
  GeometryV2Rect,
  GeometryV1V2Diff,
  ResolveDesignerGeometryV2Input,
} from "./types";

export {
  GEOMETRY_OVERLAY_COLOR_PAIRS,
  GEOMETRY_OVERLAY_OUTPUT_DIR,
  GEOMETRY_OVERLAY_V1_COLOR,
  GEOMETRY_OVERLAY_V2_COLOR,
  buildTemplateAssetRelativePath,
  resolveTemplateSlugForUa,
} from "./geometry-overlay-constants";

export {
  compareGeometryOverlayV1V2,
  formatGeometryOverlayDeltaReport,
  overlayMatchesBuilderProfile,
  resolveGeometryV1OverlayRects,
  resolveGeometryV2OverlayRects,
} from "./geometry-overlay";

export type {
  GeometryOverlayComparison,
  GeometryOverlayDelta,
  GeometryOverlayRects,
} from "./geometry-overlay";

export {
  buildGeometryOverlayOutputPath,
  renderGeometryOverlayPng,
  writeGeometryOverlaySummary,
} from "./geometry-overlay-render";

export {
  PRODUCT_MASTER_COLOR_DISPLAY_NAMES,
  PRODUCT_MASTER_OUTPUT_DIR,
  assertCrossValidationForProfiles,
  buildProductMasterGeometry,
  buildProductMasterGeometrySide,
  buildProductMasterStabilityReport,
  computeGeometryMetricStats,
  formatProductMasterGeometryReport,
  formatProductMasterStabilityReport,
} from "./product-master-geometry";

export {
  formatColorVarianceReport,
  validateMasterGeometryForProfile,
  validateMasterGeometryForProfiles,
} from "./product-master-validation";

export type {
  ProductMasterValidationIssue,
  ProductMasterValidationResult,
} from "./product-master-validation";

export type {
  GeometryMetricStats,
  ProductMasterCollarBottom,
  ProductMasterColorVariance,
  ProductMasterFactoryOrigin,
  ProductMasterGeometry,
  ProductMasterGeometrySide,
  ProductMasterStabilityMetric,
  ProductMasterStabilityReport,
} from "./product-master-profile";

export { PRODUCT_MASTER_PRODUCT_CODE } from "./product-master-profile";

export {
  UA35001_PRODUCT_MASTER_SNAPSHOT,
} from "./product-master-snapshot";

export {
  UA35001_PRODUCT_FACTORY_ANCHOR,
  buildProductMasterGeometryFromFactoryAnchor,
  getRegisteredProductFactoryAnchorCodes,
  hasProductFactoryAnchor,
  productMasterGeometryToRuntimeSnapshot,
  resolveFactoryAnchorRuntimeSnapshot,
  resolvePrintTopPxFromFactoryOrigin,
  resolveProductFactoryAnchor,
  resolveProductMasterFromFactoryAnchor,
} from "./product-factory-anchor";

export type {
  ProductFactoryAnchor,
  ProductFactoryAnchorCollar,
  ProductFactoryAnchorGarmentReference,
  ProductFactoryAnchorShoulder,
  ProductFactoryAnchorSide,
} from "./product-factory-anchor";

export {
  GeometryShadowRuntime,
  assertActiveGeometryRemainsV1,
  assertGeometryShadowSafeForProduction,
  buildGeometryShadowOverallSummary,
  compareGeometryShadow,
  createGeometryShadowRuntime,
  getGeometryShadowRuntimeState,
  isGeometryShadowEnabled,
  resolveGeometryV1RuntimeSnapshot,
  resolveProductMasterRuntimeSnapshot,
} from "./shadow-runtime";

export {
  buildGeometryShadowDebugReport,
  formatGeometryShadowComparisonReport,
  formatGeometryShadowDebugReport,
  formatGeometryShadowMetricLine,
  formatGeometryShadowOverallSummary,
  isGeometryShadowDebugEnabled,
  logGeometryShadowDebugReportOnce,
} from "./shadow-runtime-report";

export type {
  GeometryRuntimeSnapshot,
  GeometryShadowComparison,
  GeometryShadowDebugReport,
  GeometryShadowMetricDelta,
  GeometryShadowOverallSummary,
  GeometryShadowRuntimeState,
  GeometryShadowVersion,
} from "./shadow-runtime-types";

export {
  GEOMETRY_DEBUG_OUTPUT_DIR,
  GEOMETRY_DEBUG_V1_COLOR,
  GEOMETRY_DEBUG_V2_COLOR,
  DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES,
} from "./geometry-debug-types";

export type {
  GeometryDebugLayerToggles,
  GeometryDebugOverlayBundle,
  GeometryDebugOverlayDescription,
  GeometryDebugOverlayShapes,
  GeometryDebugRenderResult,
  GeometryDebugShoulderLine,
} from "./geometry-debug-types";

export {
  assertGeometryDebugSafeForProduction,
  isGeometryDebugEnabled,
  resolveGeometryDebugLayerToggles,
} from "./geometry-debug-toggle";

export {
  GeometryDebugOverlay,
  buildGeometryDebugOverlayBundle,
  createGeometryDebugOverlay,
  formatGeometryDebugOverlayDescription,
  resolveGeometryDebugV1Shapes,
  resolveGeometryDebugV2Shapes,
} from "./geometry-debug-overlay";

export {
  buildGeometryDebugOutputPath,
  buildGeometryDebugOverlaySvg,
  renderGeometryDebugOverlayFromAssets,
  renderGeometryDebugOverlayFromInstance,
  renderGeometryDebugOverlayPng,
} from "./geometry-debug-render";

export {
  SHADOW_RENDER_AUDIT_LAYERS,
  SHADOW_RENDER_CANVAS_HEIGHT,
  SHADOW_RENDER_CANVAS_WIDTH,
  SHADOW_RENDER_OUTPUT_DIR,
} from "./shadow-render-types";

export type {
  ShadowDesignerLayer,
  ShadowLayerPlacement,
  ShadowPixelDifferenceReport,
  ShadowRenderGeometryCompare,
  ShadowRenderGeometryContext,
  ShadowRenderLayerCompare,
  ShadowRenderResult,
} from "./shadow-render-types";

export {
  assertGeometryShadowRenderSafeForProduction,
  isGeometryShadowRenderEnabled,
} from "./shadow-render-toggle";

export {
  GeometryShadowRenderer,
  buildShadowRenderGeometryContext,
  buildShadowRenderOutputPath,
  compareShadowRenderGeometry,
  computeShadowPixelDifferenceAsync,
  createGeometryShadowRenderer,
  renderShadowGeometryFrame,
  renderShadowPixelHeatmap,
  resolveShadowLayerPlacements,
  runShadowRenderAudit,
} from "./shadow-render";

export {
  buildShadowRenderCompareSummary,
  formatShadowPixelDifferenceReport,
  formatShadowRenderGeometryCompare,
  formatShadowRenderLayerCompareTable,
} from "./shadow-render-report";

export {
  GEOMETRY_CALIBRATION_GOAL_NOTE,
  GEOMETRY_CALIBRATION_OUTPUT_DIR,
  GEOMETRY_V2_CALIBRATION_BASELINE,
  GEOMETRY_V2_COLLAR_BOTTOM_Y_OFFSET_PX,
  GEOMETRY_V2_COLLAR_SHOULDER_BLEND_RATIO,
  GEOMETRY_V2_COLLAR_SHOULDER_EXPAND_RATIO,
  GEOMETRY_V2_PRODUCT_MASTER_USE_MEDIAN_COLLAR,
  GEOMETRY_V2_PRODUCT_MASTER_VISUAL_BIAS_PX,
  applyCollarBottomCalibration,
  getActiveCollarDerivationCalibration,
  getBaselineCollarDerivationCalibration,
} from "./geometry-builder-calibration";

export type { CollarDerivationCalibration } from "./geometry-builder-calibration";

export {
  runGeometryQACalibration,
  writeGeometryCalibrationReport,
} from "./geometry-calibration";

export { formatGeometryCalibrationReport } from "./geometry-calibration-report";

export type {
  GeometryCalibrationAssetResult,
  GeometryCalibrationImprovement,
  GeometryCalibrationPhaseMetrics,
  GeometryCalibrationReport,
} from "./geometry-calibration-types";

export {
  createDefaultGeometryRuntimeState,
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
  DEFAULT_GEOMETRY_PREVIEW_TOGGLES,
  isGeometryRuntimeDevConsoleAvailable,
  isGeometryRuntimeProductionLocked,
  resolveEffectiveGeometryVersion,
  resolveProductionGeometryVersion,
} from "./geometry-runtime-state";

export {
  isUserFacingRuntimeSurface,
  resolveRuntimePolicyEffectiveGeometryVersion,
} from "./runtime-effective-version-policy";

export type { UserFacingRuntimeSurface } from "./runtime-effective-version-policy";

export type {
  GeometryExportRuntimeToggles,
  GeometryExportSurface,
  GeometryPreviewToggles,
  GeometryRuntimeContextValue,
  GeometryRuntimeState,
} from "./geometry-runtime-types";

export {
  GeometryRuntimeProvider,
  useGeometryRuntime,
  useGeometryRuntimeOptional,
} from "./geometry-runtime-context";

export {
  resolveGeometryRuntime,
  resolveGeometryRuntimeDebugShapes,
  resolveGeometryRuntimeForSurface,
  resolveGeometryRuntimeSnapshot,
} from "./resolve-geometry-runtime";

export {
  resolveDesignerRuntimeWorkspace,
} from "./designer-runtime-workspace";

export type { DesignerRuntimeWorkspaceRects } from "./designer-runtime-workspace";

export type { GeometryRuntimeResolved } from "./resolve-geometry-runtime";

export { resolveGeometryRuntimePhotoBridge } from "./geometry-runtime-photo-bridge";

export {
  downloadArtworkExportWithGeometryRuntime,
  downloadProductExportWithGeometryRuntime,
  downloadProductExportBundleWithGeometryRuntime,
  resolveExportGeometryVersion,
} from "./geometry-runtime-export";

export {
  applyRuntimeDownloadForward,
  resolveArtworkRuntimeForwardFromEffectiveVersion,
  resolveEffectiveDownloadGeometryVersion,
  resolveProductMockupRuntimeForwardFromEffectiveVersion,
  resolveZipRuntimeForwardFromEffectiveVersion,
  runtimeDownloadForwardsMatch,
} from "./runtime-download-forward";

export type { RuntimeDownloadForward } from "./runtime-download-forward";

export { generateProofPdfWithGeometryRuntime } from "./geometry-runtime-export-pdf.server";

export {
  resolveEffectiveExportGeometryVersion,
  resolveExportGeometryVersionFromToggle,
  resolveExportRuntimeGeometry,
  resolveExportRuntimeSnapshot,
} from "./export-runtime-snapshot";

export {
  resolveExportPipelineContext,
} from "./export-pipeline-context";

export {
  maybeLogArtworkExportRuntimeCompare,
  resolveArtworkExportRuntimeGeometry,
} from "./export-artwork-runtime";

export {
  maybeLogProductMockupRuntimeCompare,
  photoBridgeRectToCalibrationRect,
  resolveProductMockupRuntimePlacement,
} from "./product-mockup-runtime";

export {
  buildZipExportRuntimeBundle,
  downloadZipExportRuntimeBundle,
  maybeLogZipExportRuntimeCompare,
  resolveZipExportPipelineContext,
  resolveZipExportRuntimeInput,
} from "./export-zip-runtime";

export {
  buildPdfExportRuntimeCompareLog,
  maybeLogPdfExportRuntimeCompare,
  resolvePdfExportPipelineContext,
  resolvePdfExportRuntimeLayout,
  resolvePdfExportRuntimePlacement,
  resolvePdfExportRuntimePresentationOffsetY,
} from "./export-pdf-runtime";

export {
  PROOF_RUNTIME_CONTEXT_FORM_FIELD,
  createDefaultProofSubmitRuntimeContext,
  normalizeProofSubmitRuntimeContext,
  parseProofSubmitRuntimeContext,
  parseProofSubmitRuntimeContextFromFormData,
  resolveProofSubmitRuntimeContext,
  serializeProofSubmitRuntimeContext,
} from "./proof-submit-runtime-context";

export {
  applyProofPdfRuntimeForward,
  maybeLogProofSubmitPdfRuntimeCompare,
  proofPdfRuntimeForwardsMatch,
  resolveProofPdfRuntimeForward,
  resolveProofPdfRuntimeForwardFromEffectiveVersion,
  resolveProofSubmitPdfRuntimeForward,
} from "./export-pdf-submit-runtime";

export type { ProofPdfRuntimeForward } from "./export-pdf-submit-runtime";

export {
  proofMockupRuntimeForwardsMatch,
  resolveProofMockupRuntimeForward,
  resolveProofMockupRuntimeForwardFromEffectiveVersion,
  shouldUseProofProductMockupRuntime,
} from "./product-mockup-submit-runtime";

export type { ProofMockupRuntimeForward } from "./product-mockup-submit-runtime";

export {
  maybeLogProofSubmitMockupRuntimeCompare,
  renderProofSubmitProductMockupPng,
} from "./product-mockup-submit-render";

export type { RenderProofSubmitProductMockupInput } from "./product-mockup-submit-render";

export type {
  ProofSubmitEffectiveVersions,
  ProofSubmitPdfRuntimeForward,
  ProofSubmitRuntimeContext,
} from "./proof-submit-runtime-context";

export type {
  ZipExportRuntimeCompareLog,
  ZipExportRuntimeDescriptor,
} from "./export-zip-runtime";

export type {
  PdfExportRuntimeCompareLog,
  PdfExportRuntimeLayoutRect,
} from "./export-pdf-runtime";

export type {
  ArtworkExportCanvasSpec,
  ArtworkExportDpiInput,
  ArtworkExportRuntimeGeometry,
} from "./export-artwork-runtime";

export type {
  ProductMockupRuntimePlacement,
  ProductMockupRuntimeProductInput,
} from "./product-mockup-runtime";

export type {
  ExportPipelineContext,
  GeometryRuntimePhotoBridge,
  ResolveExportPipelineContextInput,
  RuntimeVisualCompensation,
} from "./export-pipeline-context";

export type {
  ExportRuntimeGeometry,
  ExportRuntimeSnapshot,
} from "./export-runtime-snapshot";

export {
  DESIGNER_TEMPLATE_V1_ASSET_ROOT,
  DESIGNER_TEMPLATE_V2_ASSET_ROOT,
  resolveDesignerTemplateAsset,
  resolveDesignerTemplateAssetFilesystemPath,
  resolveDesignerTemplateAssetResolution,
  resolveDesignerTemplateV1AssetSrc,
  resolveDesignerTemplateV2AssetSrc,
} from "./designer-template-runtime";

export type { DesignerTemplateAssetResolution } from "./designer-template-runtime";
