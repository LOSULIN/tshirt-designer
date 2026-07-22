export {
  SILHOUETTE_COMPENSATION_BASELINE_SIZE,
  SILHOUETTE_CHEST_BLEND,
  SILHOUETTE_LENGTH_BLEND,
  SILHOUETTE_SHOULDER_BLEND,
  SILHOUETTE_SLEEVE_BLEND,
  SILHOUETTE_COMPENSATION_MIN,
  SILHOUETTE_COMPENSATION_MAX,
  resolveGarmentSilhouetteCompensation,
  isSilhouetteCompensationIdentity,
  type GarmentSilhouetteAxes,
  type GarmentSilhouetteCompensation,
} from "./garment-silhouette-compensation";
export {
  UA35001_SILHOUETTE_ANCHORS,
  type GarmentSilhouetteAnchors,
} from "./garment-silhouette-anchors";
export { warpGarmentSilhouetteOnCanvas } from "./garment-silhouette-warp";
export {
  composeResultPanelMockup,
  type ResultPanelMockupComposeInput,
} from "./compose-result-panel-mockup";
export {
  renderResultPanelMockupOnProduct,
  renderResultPanelMockupWithCalibration,
  type ResultPanelMockupEngineInput,
  type RenderResultPanelMockupWithCalibrationInput,
} from "./render-result-panel-mockup";
export { buildResultPanelProductPreview } from "./build-result-panel-product-preview";
export {
  resolveRealityCalibrationFromPlacement,
  REALITY_CALIBRATION_BASELINE_SIZE,
  REALITY_WIDTH_CLAMP,
  REALITY_HEIGHT_CLAMP,
  REALITY_AREA_CLAMP,
  REALITY_MOCKUP_CANVAS,
  type RealityCalibrationMetrics,
} from "./reality-calibration";
export { realityCalibrationToCss } from "./reality-calibration-css";
export { resolveResultPanelArtworkPlacement } from "./resolve-result-panel-artwork-placement";
export {
  isResultPanelDisplayPreview,
  type ResultPanelDisplayLayer,
  type ResultPanelDisplayPreview,
} from "./result-panel-display-preview";
export {
  resolveVisibleGarmentProportion,
  VISIBLE_PROPORTION_BASELINE_SIZE,
  type VisibleGarmentProportionProfile,
} from "./visible-garment-proportion";
export {
  visibleGarmentProportionToCss,
  type VisibleGarmentProportionStyles,
} from "./visible-garment-proportion-css";
export {
  computeVisibleGarmentLayout,
  measureVisibleGarmentInLayout,
  VISIBLE_GARMENT_SOURCE_HEIGHT,
  VISIBLE_GARMENT_SOURCE_HEIGHT_RATIO,
  VISIBLE_GARMENT_SOURCE_WIDTH,
  type VisibleGarmentLayoutMetrics,
} from "./visible-garment-proportion-layout";
