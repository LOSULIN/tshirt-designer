export {
  PHOTO_BASELINE_GARMENT_BOUNDS_PREVIEW,
  PHOTO_BASELINE_PRINT_BEFORE_COMPENSATION_PREVIEW,
  PHOTO_CALIBRATION_BASELINE_SIZE,
  scalePhotoRect,
  resolvePhotoBaselineCollarY,
} from "./constants";

export {
  resolveGarmentComposeFrames,
  resolveGarmentPhotoFrame,
} from "./resolve-garment-photo-frame";

export type {
  GarmentComposeFrames,
  GarmentPhotoFrame,
  GarmentPhotoLine,
  GarmentPhotoPoint,
  ResolveGarmentComposeFramesInput,
  ResolveGarmentPhotoFrameInput,
} from "./types";
