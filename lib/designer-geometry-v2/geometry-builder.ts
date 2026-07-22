/**
 * Designer Geometry V2 — Measurement → Builder → Geometry Profile.
 *
 * Does not wire into runtime. Output is validation-ready GeometryProfileV2.
 */

import type { Side } from "@/lib/constants";
import {
  GEOMETRY_V2_FACTORY_PRINT_AREA_CM,
  GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM,
  GEOMETRY_V2_FACTORY_SAFE_AREA_CM,
  GEOMETRY_V2_PRINT_PX_PER_CM,
} from "./constants";
import {
  deriveFactoryCollarBottom,
  deriveNeckMetrics,
  deriveShoulderMetrics,
  resolveFactoryOrigin,
} from "./factory-origin";
import type {
  BuildGeometryProfileV2Input,
  GeometryProfileV2,
} from "./geometry-profile";
import type { RawAlphaBuffer } from "./measure-garment-alpha";
import {
  measureAlphaSilhouetteFromBuffer,
  resolveGeometryV2PrintPxPerCm,
} from "./measure-garment-alpha";
import {
  applyCollarBottomCalibrationWith,
  type CollarDerivationCalibration,
  getActiveCollarDerivationCalibration,
} from "./geometry-builder-calibration";

function buildArtworkStageRect(
  side: Side,
  factoryOrigin: { x: number; y: number },
  pxPerCm: number,
): GeometryV2Rect {
  const { widthCm, heightCm } = GEOMETRY_V2_FACTORY_PRINT_AREA_CM[side];
  const width = widthCm * pxPerCm;
  const height = heightCm * pxPerCm;
  const top =
    factoryOrigin.y +
    GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[side] * pxPerCm;
  const left = factoryOrigin.x - width / 2;
  return { left, top, width, height };
}

function buildSafeAreaRect(
  side: Side,
  factoryOrigin: { x: number; y: number },
  pxPerCm: number,
): GeometryV2Rect {
  const { widthCm, heightCm } = GEOMETRY_V2_FACTORY_SAFE_AREA_CM[side];
  const width = widthCm * pxPerCm;
  const height = heightCm * pxPerCm;
  const top =
    factoryOrigin.y +
    GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM[side] * pxPerCm;
  const left = factoryOrigin.x - width / 2;
  return { left, top, width, height };
}

export function buildGeometryProfileV2(
  input: BuildGeometryProfileV2Input,
  calibration?: CollarDerivationCalibration,
): GeometryProfileV2 {
  const measurement = measureAlphaSilhouetteFromBuffer(input.buffer);
  return buildGeometryProfileV2FromMeasurement({
    ...input,
    measurement,
    calibration,
  });
}

export function buildGeometryProfileV2FromMeasurement(input: {
  side: Side;
  colorSlug: string;
  sourceAsset: string;
  buffer: RawAlphaBuffer;
  measurement: ReturnType<typeof measureAlphaSilhouetteFromBuffer>;
  calibration?: CollarDerivationCalibration;
}): GeometryProfileV2 {
  const calibration = input.calibration ?? getActiveCollarDerivationCalibration();
  const pxPerCm = resolveGeometryV2PrintPxPerCm();
  const shoulder = deriveShoulderMetrics(input.buffer, input.measurement);
  const neck = deriveNeckMetrics(input.buffer, input.measurement, shoulder);
  const collarBottomRaw = deriveFactoryCollarBottom(
    input.buffer,
    input.measurement,
    neck,
    shoulder,
    calibration,
  );
  const collarBottom = {
    ...collarBottomRaw,
    y: applyCollarBottomCalibrationWith(
      collarBottomRaw.y,
      input.side,
      calibration,
    ),
  };
  const factoryOrigin = resolveFactoryOrigin(
    input.side,
    collarBottom,
    pxPerCm,
  );
  const artworkStage = buildArtworkStageRect(
    input.side,
    factoryOrigin,
    pxPerCm,
  );
  const safeArea = buildSafeAreaRect(input.side, factoryOrigin, pxPerCm);

  return {
    version: 2,
    side: input.side,
    colorSlug: input.colorSlug,
    sourceAsset: input.sourceAsset,
    canvas: input.measurement.canvas,
    alphaBoundingBox: input.measurement.alphaBoundingBox,
    garmentBounds: input.measurement.alphaBoundingBox,
    garmentCenter: input.measurement.centerPoint,
    shoulder,
    neck,
    collarBottom,
    factoryOrigin,
    artworkStage,
    safeArea,
  };
}
