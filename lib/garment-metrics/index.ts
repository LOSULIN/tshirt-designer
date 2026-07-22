export {
  METRICS_BASELINE_CHEST_CM,
  METRICS_BASELINE_LENGTH_CM,
  METRICS_BASELINE_SIZE,
  METRICS_TEMPLATE_WIDTH_PX,
  METRICS_TEMPLATE_HEIGHT_PX,
} from "./constants";

export { resolveGarmentMetrics, resolveBaselineGarmentMetrics } from "./resolve-garment-metrics";
export {
  isMetricsBaselineSize,
  resolveMockupComposeFrames,
} from "./mockup-compose-frames";
export type { MockupComposeFrames, ResolveMockupComposeFramesInput } from "./mockup-compose-frames";
export type {
  GarmentMetrics,
  GarmentMetricsLine,
  GarmentMetricsPoint,
  GarmentMetricsRatios,
  GarmentMetricsRect,
  ResolveGarmentMetricsInput,
} from "./types";
