/**
 * UI Print Area — 統一 mode selector 入口
 *
 * | view | 用途 |
 * |------|------|
 * | editor | 設計器主畫布 |
 * | flat | Flat Shirt 側欄／瀏覽 |
 * | model | 模特預覽 |
 *
 * 預設 mode：`DEFAULT_PRINT_MODE`（garment）
 * 覆寫：傳入 `options.mode` 或 URL `?printPositionMode=canvas`
 */

import type { Side } from "../constants";
import {
  getFlatMockupPrintAreaContainerStyle,
  getModelMockupPrintAreaContainerStyle,
} from "./mockup";
import {
  getPreviewPrintAreaContainerStyle,
  type PreviewSide,
} from "./preview";
import {
  DEFAULT_PRINT_MODE,
  type PreviewPrintPositionOptions,
  resolvePreviewPrintPositionMode,
} from "./preview-position-mode";
import { UI_GLOBAL_PRINT_OFFSET_Y_PX } from "./ui-print-offset";

export { UI_GLOBAL_PRINT_OFFSET_Y_PX, DEFAULT_PRINT_MODE };

export type UiPrintAreaView = "editor" | "flat" | "model";

function resolveOptions(
  options?: PreviewPrintPositionOptions,
): PreviewPrintPositionOptions {
  return {
    mode: resolvePreviewPrintPositionMode(options?.mode),
    size: options?.size,
  };
}

/** 所有 UI 印刷區框線應經此函式（Preview / Model 共用 mode selector） */
export function getUiPrintAreaContainerStyle(
  view: UiPrintAreaView,
  side: Side = "front",
  options?: PreviewPrintPositionOptions,
) {
  const resolved = resolveOptions(options);
  if (view === "model") {
    return getModelMockupPrintAreaContainerStyle(side, resolved);
  }
  return getPreviewPrintAreaContainerStyle(side as PreviewSide, resolved);
}

export function getEditorPrintAreaContainerStyle(
  side: PreviewSide = "front",
  options?: PreviewPrintPositionOptions,
) {
  return getUiPrintAreaContainerStyle("editor", side, options);
}

export function getFlatShirtPrintAreaContainerStyle(
  side: PreviewSide = "front",
  options?: PreviewPrintPositionOptions,
) {
  return getUiPrintAreaContainerStyle("flat", side, options);
}

export function getModelPreviewPrintAreaContainerStyle(
  side: Side = "front",
  options?: PreviewPrintPositionOptions,
) {
  return getUiPrintAreaContainerStyle("model", side, options);
}

/** Mockup PNG 匯出預覽（維持 canvas/mockup flat，不走 garment UI） */
export function getFlatMockupExportPrintAreaContainerStyle(
  side: PreviewSide = "front",
) {
  return getFlatMockupPrintAreaContainerStyle(side);
}
