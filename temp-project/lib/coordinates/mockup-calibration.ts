/**
 * Mockup Calibration — 比對 Editor / Flat Shirt / Mockup 視覺錨點。
 * 僅供預覽校準；不修改 Production 或匯出邏輯。
 */

import type { Side } from "../constants";
import {
  getFlatMockupPrintAreaContainerStyle,
  getFlatMockupPrintReference,
  getModelMockupPrintAreaContainerStyle,
  getModelMockupPrintReference,
  MOCKUP_FLAT_CONTAINER,
  MOCKUP_MODEL_CONTAINER,
  MOCKUP_MODEL_PRINT_REF_BASE_Y_BY_SIDE,
} from "./mockup";
import {
  getPreviewPrintAreaContainerStyle,
  getPreviewPrintReference,
  PREVIEW_CONTAINER,
} from "./preview";
import { UI_GLOBAL_PRINT_OFFSET_Y_PX } from "./ui-print-offset";
import { getProductionPrintAreaMm } from "./production";

/** 校準前 Preview / Mockup flat 基準錨點 Y */
export const UNCALIBRATED_REF_Y = 0.53;

export type CalibrationViewId =
  | "editor_preview"
  | "flat_shirt_preview"
  | "flat_mockup"
  | "model_mockup";

export interface PrintAreaRectPx {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface CalibrationViewMetrics {
  id: CalibrationViewId;
  label: string;
  subtitle: string;
  coordinateSystem: "preview" | "mockup";
  container: { width: number; height: number };
  ref: { x: number; y: number };
  rectPx: PrintAreaRectPx;
  /** 相對 Editor (Preview) 中心的像素差（正＝較下方） */
  deltaFromEditorPx: { x: number; y: number };
  style: {
    left: string;
    top: string;
    width: string;
    height: string;
    transform: string;
  };
}

export interface MockupCalibrationReport {
  side: Side;
  uncalibratedRefY: number;
  previewOffsetPx: number;
  views: CalibrationViewMetrics[];
  yOffsetAnalysis: {
    flatMockupVsEditorPx: number;
    modelMockupVsEditorPx: number;
    modelMockupVsEditorFrontPx: number;
    modelMockupVsEditorBackPx: number;
    /** 若要讓 Model 與 Editor 中心對齊，建議調整的 ref.y 增量（相對值） */
    suggestedModelRefYDelta: { front: number; back: number };
  };
  beforeAfter: {
    before: { refY: number; centerYPx: number; topPx: number };
    after: { refY: number; centerYPx: number; topPx: number };
    deltaCenterYPx: number;
  };
}

function computePrintRectPx(
  ref: { x: number; y: number },
  container: { width: number; height: number },
  printWidthMm: number,
  printHeightMm: number,
): PrintAreaRectPx {
  const width = (printWidthMm / container.width) * container.width;
  const height = (printHeightMm / container.height) * container.height;
  const centerX = ref.x * container.width;
  const centerY = ref.y * container.height;
  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
    centerX,
    centerY,
  };
}

function buildViewMetrics(
  id: CalibrationViewId,
  label: string,
  subtitle: string,
  coordinateSystem: "preview" | "mockup",
  container: { width: number; height: number },
  ref: { x: number; y: number },
  style: CalibrationViewMetrics["style"],
  editorCenter: { x: number; y: number },
): CalibrationViewMetrics {
  const printArea = getProductionPrintAreaMm();
  const rectPx = computePrintRectPx(ref, container, printArea.width_mm, printArea.height_mm);
  return {
    id,
    label,
    subtitle,
    coordinateSystem,
    container: { ...container },
    ref: { ...ref },
    rectPx,
    deltaFromEditorPx: {
      x: rectPx.centerX - editorCenter.x,
      y: rectPx.centerY - editorCenter.y,
    },
    style,
  };
}

export function buildMockupCalibrationReport(side: Side = "front"): MockupCalibrationReport {
  const printArea = getProductionPrintAreaMm();
  const editorRef = getPreviewPrintReference(side);
  const editorRect = computePrintRectPx(
    editorRef,
    PREVIEW_CONTAINER,
    printArea.width_mm,
    printArea.height_mm,
  );
  const editorCenter = { x: editorRect.centerX, y: editorRect.centerY };

  const views: CalibrationViewMetrics[] = [
    buildViewMetrics(
      "editor_preview",
      "Editor",
      "設計器主畫布 · Preview",
      "preview",
      PREVIEW_CONTAINER,
      editorRef,
      getPreviewPrintAreaContainerStyle(side),
      editorCenter,
    ),
    buildViewMetrics(
      "flat_shirt_preview",
      "Flat Shirt",
      "右側平面預覽 · Preview（同 Editor）",
      "preview",
      PREVIEW_CONTAINER,
      editorRef,
      getPreviewPrintAreaContainerStyle(side),
      editorCenter,
    ),
    buildViewMetrics(
      "flat_mockup",
      "Flat Mockup",
      "平面 mockup 匯出 · Mockup flat",
      "mockup",
      MOCKUP_FLAT_CONTAINER,
      getFlatMockupPrintReference(side),
      getFlatMockupPrintAreaContainerStyle(side),
      editorCenter,
    ),
    buildViewMetrics(
      "model_mockup",
      "Model Mockup",
      "模特預覽 · Mockup model",
      "mockup",
      MOCKUP_MODEL_CONTAINER,
      getModelMockupPrintReference(side),
      getModelMockupPrintAreaContainerStyle(side),
      editorCenter,
    ),
  ];

  const modelView = views.find((v) => v.id === "model_mockup")!;
  const flatMockupView = views.find((v) => v.id === "flat_mockup")!;

  const modelFrontRef = getModelMockupPrintReference("front");
  const modelBackRef = getModelMockupPrintReference("back");
  const previewFrontRef = getPreviewPrintReference("front");
  const previewBackRef = getPreviewPrintReference("back");

  const beforeCenterY = UNCALIBRATED_REF_Y * PREVIEW_CONTAINER.height;
  const afterCenterY = editorRef.y * PREVIEW_CONTAINER.height;
  const beforeTop = beforeCenterY - printArea.height_mm / 2;
  const afterTop = afterCenterY - printArea.height_mm / 2;

  return {
    side,
    uncalibratedRefY: UNCALIBRATED_REF_Y,
    previewOffsetPx: UI_GLOBAL_PRINT_OFFSET_Y_PX,
    views,
    yOffsetAnalysis: {
      flatMockupVsEditorPx: flatMockupView.deltaFromEditorPx.y,
      modelMockupVsEditorPx: modelView.deltaFromEditorPx.y,
      modelMockupVsEditorFrontPx:
        (modelFrontRef.y - previewFrontRef.y) * MOCKUP_MODEL_CONTAINER.height,
      modelMockupVsEditorBackPx:
        (modelBackRef.y - previewBackRef.y) * MOCKUP_MODEL_CONTAINER.height,
      suggestedModelRefYDelta: {
        front:
          previewFrontRef.y -
          MOCKUP_MODEL_PRINT_REF_BASE_Y_BY_SIDE.front,
        back:
          previewBackRef.y - MOCKUP_MODEL_PRINT_REF_BASE_Y_BY_SIDE.back,
      },
    },
    beforeAfter: {
      before: {
        refY: UNCALIBRATED_REF_Y,
        centerYPx: beforeCenterY,
        topPx: beforeTop,
      },
      after: {
        refY: editorRef.y,
        centerYPx: afterCenterY,
        topPx: afterTop,
      },
      deltaCenterYPx: afterCenterY - beforeCenterY,
    },
  };
}

export function formatCalibrationPx(px: number): string {
  const rounded = Math.round(px * 10) / 10;
  if (rounded === 0) return "0";
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}
