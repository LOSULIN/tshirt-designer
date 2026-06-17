import type { CSSProperties } from "react";
import { getOverlayPxPerCm } from "./design-cm";
import type { TextDesignLayer, TextFontFamily } from "./types";
import { buildCanvasFont, resolveCssFontFamily } from "./text-layer";

export type TextAlign = "left" | "center" | "right";

export interface TextStrokeStyle {
  color: string;
  width_cm: number;
}

export interface TextShadowStyle {
  color: string;
  blur_cm: number;
  offsetX_cm: number;
  offsetY_cm: number;
}

export interface RichTextFields {
  fontStyle: "normal" | "italic";
  letterSpacing_cm: number;
  lineHeight: number;
  textAlign: TextAlign;
  stroke: TextStrokeStyle | null;
  shadow: TextShadowStyle | null;
}

export const DEFAULT_TEXT_STROKE: TextStrokeStyle = {
  color: "#000000",
  width_cm: 0,
};

export const DEFAULT_TEXT_SHADOW: TextShadowStyle = {
  color: "rgba(0,0,0,0.35)",
  blur_cm: 0.4,
  offsetX_cm: 0.2,
  offsetY_cm: 0.2,
};

export const DEFAULT_RICH_TEXT_FIELDS: RichTextFields = {
  fontStyle: "normal",
  letterSpacing_cm: 0,
  lineHeight: 1.3,
  textAlign: "center",
  stroke: null,
  shadow: null,
};

export function normalizeRichTextFields(
  partial?: Partial<RichTextFields>,
): RichTextFields {
  const stroke =
    partial?.stroke && partial.stroke.width_cm > 0
      ? { ...DEFAULT_TEXT_STROKE, ...partial.stroke }
      : null;
  const shadow = partial?.shadow ?? null;
  return {
    fontStyle: partial?.fontStyle ?? DEFAULT_RICH_TEXT_FIELDS.fontStyle,
    letterSpacing_cm:
      partial?.letterSpacing_cm ?? DEFAULT_RICH_TEXT_FIELDS.letterSpacing_cm,
    lineHeight: partial?.lineHeight ?? DEFAULT_RICH_TEXT_FIELDS.lineHeight,
    textAlign: partial?.textAlign ?? DEFAULT_RICH_TEXT_FIELDS.textAlign,
    stroke,
    shadow,
  };
}

export function normalizeTextDesignLayer(layer: TextDesignLayer): TextDesignLayer {
  return {
    ...layer,
    ...normalizeRichTextFields(layer),
  };
}

export function isTextBold(layer: TextDesignLayer): boolean {
  return layer.fontWeight >= 600;
}

export function toggleTextBold(layer: TextDesignLayer): TextDesignLayer {
  return {
    ...layer,
    fontWeight: isTextBold(layer) ? 400 : 700,
  };
}

export function toggleTextItalic(layer: TextDesignLayer): TextDesignLayer {
  return {
    ...layer,
    fontStyle: layer.fontStyle === "italic" ? "normal" : "italic",
  };
}

export function measureRichTextBoundsCm(
  layer: Pick<
    TextDesignLayer,
    | "text"
    | "fontSize_cm"
    | "fontFamily"
    | "fontWeight"
    | "fontStyle"
    | "letterSpacing_cm"
    | "lineHeight"
  >,
  fontSize_cm = layer.fontSize_cm,
  pxPerCm: number = getOverlayPxPerCm(),
): { width_cm: number; height_cm: number } {
  return measureRichTextGlyphBoundsCmWithPxPerCm(
    layer as TextDesignLayer,
    fontSize_cm,
    pxPerCm,
  );
}

/** SSR／無 Canvas 時的 glyph 外框估算（避免用 lineHeight 當單行高度） */
function measureRichTextGlyphBoundsCmFallback(
  lines: string[],
  fontSize_cm: number,
  letterSpacing_cm: number,
  lineHeight: number,
): { width_cm: number; height_cm: number } {
  const glyphHeightRatio = 0.88;
  const charWidthEm = 0.56;
  let maxLineWidthCm = 0;
  for (const line of lines) {
    const chars = Math.max(line.length, 1);
    const spacing = chars > 1 ? letterSpacing_cm * (chars - 1) : 0;
    maxLineWidthCm = Math.max(
      maxLineWidthCm,
      chars * fontSize_cm * charWidthEm + spacing,
    );
  }
  const glyphHeight_cm = fontSize_cm * glyphHeightRatio;
  const height_cm =
    lines.length <= 1
      ? glyphHeight_cm
      : glyphHeight_cm + (lines.length - 1) * fontSize_cm * lineHeight;
  return {
    width_cm: Math.max(maxLineWidthCm, fontSize_cm * 0.5),
    height_cm,
  };
}

export interface RichTextGlyphBoundsPx {
  widthPx: number;
  heightPx: number;
}

/**
 * 與 drawRichTextOnCanvas / logAfterFillTextMetrics 相同的 Canvas measureText 流程。
 * 寬度 = actualBoundingBoxLeft + actualBoundingBoxRight (+ letterSpacing)
 */
export function measureRichTextGlyphBoundsPx(
  ctx: CanvasRenderingContext2D,
  layer: Pick<
    TextDesignLayer,
    | "text"
    | "fontFamily"
    | "fontWeight"
    | "fontStyle"
    | "letterSpacing_cm"
    | "lineHeight"
  >,
  fontSizePx: number,
  letterSpacingPx = 0,
): RichTextGlyphBoundsPx {
  const style = normalizeRichTextFields(layer);
  const lines = (layer.text || " ").split("\n");

  ctx.font = buildRichCanvasFont(
    {
      fontWeight: layer.fontWeight,
      fontFamily: layer.fontFamily,
      fontStyle: style.fontStyle,
    },
    fontSizePx,
  );

  let maxWidthPx = 0;
  let maxGlyphHeightPx = 0;
  for (const line of lines) {
    const measured = measureCanvasFillTextMetrics(ctx, line);
    const extra =
      line.length > 1 ? letterSpacingPx * (line.length - 1) : 0;
    maxWidthPx = Math.max(maxWidthPx, measured.actualTextWidth + extra);

    const metrics = ctx.measureText(line || " ");
    const ascent = metrics.actualBoundingBoxAscent ?? fontSizePx * 0.8;
    const descent = metrics.actualBoundingBoxDescent ?? fontSizePx * 0.2;
    maxGlyphHeightPx = Math.max(maxGlyphHeightPx, ascent + descent);
  }

  const lineAdvancePx = Math.max(fontSizePx * style.lineHeight, maxGlyphHeightPx);
  const heightPx =
    lines.length <= 1
      ? maxGlyphHeightPx
      : maxGlyphHeightPx + (lines.length - 1) * lineAdvancePx;

  return { widthPx: maxWidthPx, heightPx };
}

/** baseFontSize_cm × pxPerCm → measureText → cm（auto-fit 與 draw 共用） */
export function measureRichTextGlyphBoundsCmWithPxPerCm(
  layer: TextDesignLayer,
  fontSize_cm: number,
  pxPerCm: number,
): { width_cm: number; height_cm: number } {
  const style = normalizeRichTextFields(layer);
  const fontSizePx = fontSize_cm * pxPerCm;
  const letterSpacingPx = style.letterSpacing_cm * pxPerCm;
  const lines = (layer.text || " ").split("\n");

  if (typeof document === "undefined" || pxPerCm <= 0) {
    return measureRichTextGlyphBoundsCmFallback(
      lines,
      fontSize_cm,
      style.letterSpacing_cm,
      style.lineHeight,
    );
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return measureRichTextGlyphBoundsCmFallback(
      lines,
      fontSize_cm,
      style.letterSpacing_cm,
      style.lineHeight,
    );
  }

  const bounds = measureRichTextGlyphBoundsPx(
    ctx,
    layer,
    fontSizePx,
    letterSpacingPx,
  );
  return {
    width_cm: bounds.widthPx / pxPerCm,
    height_cm: bounds.heightPx / pxPerCm,
  };
}

/** 版型印刷框 auto-fit：保留約 5% 安全邊距 */
export const TEXT_AUTOFIT_MARGIN_RATIO = 0.95;

/** keepRatio:false 版型框量測 glyph 的固定基準字級（cm）；與 layer.fontSize_cm 無關 */
export const TEXT_AUTOFIT_REFERENCE_FONT_SIZE_CM = 1;

function usesPlacementBoxAutoFit(layer: TextDesignLayer): boolean {
  return layer.keepRatio === false;
}

export function usesTextPlacementAutoFit(
  layer: TextDesignLayer,
  placementRect?: { width_cm: number; height_cm: number },
): boolean {
  if (layer.keepRatio === false) {
    return true;
  }
  if (!placementRect) {
    return false;
  }
  const matchesStoredPlacement =
    Math.abs(placementRect.width_cm - layer.width_cm) < 0.05 &&
    Math.abs(placementRect.height_cm - layer.height_cm) < 0.05;
  if (!matchesStoredPlacement) {
    return false;
  }
  const baseFontSize_cm = layer.fontSize_cm * layer.scale;
  const glyph = measureRichTextGlyphBoundsCmWithPxPerCm(
    layer,
    baseFontSize_cm,
    getOverlayPxPerCm(),
  );
  return (
    layer.width_cm > glyph.width_cm * 1.05 ||
    layer.height_cm > glyph.height_cm * 1.05
  );
}

export interface RichTextRenderMetrics {
  uniformScale: number;
  fontSize_cm: number;
  letterSpacing_cm: number;
  strokeWidth_cm: number;
  shadow: TextShadowStyle | null;
}

/** 文字 glyph 實際外框（指定字級量測） */
export function measureRichTextGlyphBoundsCm(
  layer: Pick<
    TextDesignLayer,
    | "text"
    | "fontSize_cm"
    | "fontFamily"
    | "fontWeight"
    | "fontStyle"
    | "letterSpacing_cm"
    | "lineHeight"
  >,
  fontSize_cm = layer.fontSize_cm,
  pxPerCm: number = getOverlayPxPerCm(),
): { width_cm: number; height_cm: number } {
  return measureRichTextGlyphBoundsCmWithPxPerCm(
    layer as TextDesignLayer,
    fontSize_cm,
    pxPerCm,
  );
}

export interface RichTextAutoFitDebugInfo {
  autoFitEnabled: boolean;
  measureFontSize_cm: number;
  targetFontSize_cm: number;
  glyphWidthPx: number;
  glyphHeightPx: number;
  pxPerCm: number;
  glyphWidthCm: number;
  glyphHeightCm: number;
  availableWidthCm: number;
  availableHeightCm: number;
  scaleX: number;
  scaleY: number;
  uniformScale: number;
}

interface RichTextAutoFitScales {
  autoFitEnabled: boolean;
  measureFontSize_cm: number;
  targetFontSize_cm: number;
  glyphWidthCm: number;
  glyphHeightCm: number;
  availableWidthCm: number;
  availableHeightCm: number;
  scaleX: number;
  scaleY: number;
  uniformScale: number;
}

function computeRichTextAutoFitScales(
  layer: TextDesignLayer,
  placementRect: { width_cm: number; height_cm: number },
  pxPerCm: number,
): RichTextAutoFitScales {
  const autoFitEnabled = usesTextPlacementAutoFit(layer, placementRect);
  const placementBoxAutoFit = usesPlacementBoxAutoFit(layer);
  const measureFontSize_cm = placementBoxAutoFit
    ? TEXT_AUTOFIT_REFERENCE_FONT_SIZE_CM
    : layer.fontSize_cm * layer.scale;
  const glyph = measureRichTextGlyphBoundsCmWithPxPerCm(
    layer,
    measureFontSize_cm,
    pxPerCm,
  );
  const glyphWidthCm = glyph.width_cm;
  const glyphHeightCm = glyph.height_cm;
  const availableWidthCm = placementRect.width_cm * TEXT_AUTOFIT_MARGIN_RATIO;
  const availableHeightCm = placementRect.height_cm * TEXT_AUTOFIT_MARGIN_RATIO;

  if (
    !autoFitEnabled ||
    glyphWidthCm <= 0 ||
    glyphHeightCm <= 0 ||
    placementRect.width_cm <= 0 ||
    placementRect.height_cm <= 0
  ) {
    const fallbackFontSize_cm = layer.fontSize_cm * layer.scale;
    return {
      autoFitEnabled,
      measureFontSize_cm,
      targetFontSize_cm: fallbackFontSize_cm,
      glyphWidthCm,
      glyphHeightCm,
      availableWidthCm,
      availableHeightCm,
      scaleX: 1,
      scaleY: 1,
      uniformScale: 1,
    };
  }

  const scaleX = availableWidthCm / glyphWidthCm;
  const scaleY = availableHeightCm / glyphHeightCm;
  const uniformScale = Math.min(scaleX, scaleY);
  const targetFontSize_cm = placementBoxAutoFit
    ? TEXT_AUTOFIT_REFERENCE_FONT_SIZE_CM * uniformScale
    : measureFontSize_cm * uniformScale;

  return {
    autoFitEnabled,
    measureFontSize_cm,
    targetFontSize_cm,
    glyphWidthCm,
    glyphHeightCm,
    availableWidthCm,
    availableHeightCm,
    scaleX,
    scaleY,
    uniformScale,
  };
}

export function computeRichTextAutoFitDebug(
  layer: TextDesignLayer,
  placementRect: { width_cm: number; height_cm: number },
  pxPerCm: number,
): RichTextAutoFitDebugInfo {
  const scales = computeRichTextAutoFitScales(layer, placementRect, pxPerCm);
  return {
    autoFitEnabled: scales.autoFitEnabled,
    measureFontSize_cm: scales.measureFontSize_cm,
    targetFontSize_cm: scales.targetFontSize_cm,
    glyphWidthPx: scales.glyphWidthCm * pxPerCm,
    glyphHeightPx: scales.glyphHeightCm * pxPerCm,
    pxPerCm,
    glyphWidthCm: scales.glyphWidthCm,
    glyphHeightCm: scales.glyphHeightCm,
    availableWidthCm: scales.availableWidthCm,
    availableHeightCm: scales.availableHeightCm,
    scaleX: scales.scaleX,
    scaleY: scales.scaleY,
    uniformScale: scales.uniformScale,
  };
}

export function logAutoFitDebug(
  info: RichTextAutoFitDebugInfo,
  extra?: Record<string, unknown>,
): void {
  if (typeof console === "undefined") return;
  console.log("[AutoFit Debug]", {
    measureFontSize_cm: roundDebug(info.measureFontSize_cm),
    targetFontSize_cm: roundDebug(info.targetFontSize_cm),
    glyphWidthPx: roundDebug(info.glyphWidthPx),
    glyphHeightPx: roundDebug(info.glyphHeightPx),
    pxPerCm: roundDebug(info.pxPerCm),
    glyphWidthCm: roundDebug(info.glyphWidthCm),
    glyphHeightCm: roundDebug(info.glyphHeightCm),
    availableWidthCm: roundDebug(info.availableWidthCm),
    availableHeightCm: roundDebug(info.availableHeightCm),
    scaleX: roundDebug(info.scaleX),
    scaleY: roundDebug(info.scaleY),
    uniformScale: roundDebug(info.uniformScale),
    autoFitEnabled: info.autoFitEnabled,
    ...extra,
  });
}

function roundDebug(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function serializeCanvasTransform(ctx: CanvasRenderingContext2D): {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
} {
  const t = ctx.getTransform();
  return {
    a: roundDebug(t.a),
    b: roundDebug(t.b),
    c: roundDebug(t.c),
    d: roundDebug(t.d),
    e: roundDebug(t.e),
    f: roundDebug(t.f),
  };
}

export function logBeforeFillText(
  ctx: CanvasRenderingContext2D,
  params: {
    drawX: number;
    drawY: number;
    boxWidthPx: number;
    boxHeightPx: number;
    rectWidthCm: number;
    rectHeightCm: number;
    rectWidthPx: number;
    rectHeightPx: number;
    lineIndex?: number;
    line?: string;
  },
): void {
  if (typeof console === "undefined") return;
  console.log("[Before fillText]", {
    font: ctx.font,
    drawX: roundDebug(params.drawX),
    drawY: roundDebug(params.drawY),
    boxWidthPx: roundDebug(params.boxWidthPx),
    boxHeightPx: roundDebug(params.boxHeightPx),
    rectWidthCm: roundDebug(params.rectWidthCm),
    rectHeightCm: roundDebug(params.rectHeightCm),
    rectWidthPx: roundDebug(params.rectWidthPx),
    rectHeightPx: roundDebug(params.rectHeightPx),
    currentTransform: serializeCanvasTransform(ctx),
    ...(params.lineIndex !== undefined ? { lineIndex: params.lineIndex } : {}),
    ...(params.line !== undefined ? { line: params.line } : {}),
  });
}

function measureCanvasFillTextMetrics(
  ctx: CanvasRenderingContext2D,
  text: string,
): {
  actualTextWidth: number;
  actualTextHeight: number;
  measureTextWidth: number;
  measureTextHeight: number;
} {
  const metrics = ctx.measureText(text || " ");
  const ascent = metrics.actualBoundingBoxAscent ?? 0;
  const descent = metrics.actualBoundingBoxDescent ?? 0;
  const left = metrics.actualBoundingBoxLeft ?? 0;
  const right = metrics.actualBoundingBoxRight ?? metrics.width;
  const actualTextWidth = left + right;
  const actualTextHeight = ascent + descent;
  return {
    actualTextWidth,
    actualTextHeight,
    measureTextWidth: metrics.width,
    measureTextHeight: actualTextHeight > 0 ? actualTextHeight : ascent + descent,
  };
}

export function logAfterFillTextMetrics(
  ctx: CanvasRenderingContext2D,
  text: string,
  extra?: {
    lineIndex?: number;
    line?: string;
    pxPerCm?: number;
    expectedWidthPxAtBase?: number;
    expectedWidthPxAtRender?: number;
  },
): void {
  if (typeof console === "undefined") return;
  const measured = measureCanvasFillTextMetrics(ctx, text);
  console.log("[After fillText metrics]", {
    actualTextWidth: roundDebug(measured.actualTextWidth),
    actualTextHeight: roundDebug(measured.actualTextHeight),
    measureTextWidth: roundDebug(measured.measureTextWidth),
    measureTextHeight: roundDebug(measured.measureTextHeight),
    ...(extra?.pxPerCm !== undefined
      ? {
          actualTextWidthCm: roundDebug(
            measured.actualTextWidth / extra.pxPerCm,
          ),
        }
      : {}),
    ...(extra?.expectedWidthPxAtBase !== undefined
      ? {
          expectedWidthPxAtBase: roundDebug(extra.expectedWidthPxAtBase),
          expectedWidthPxAtRender: roundDebug(
            extra.expectedWidthPxAtRender ?? extra.expectedWidthPxAtBase,
          ),
        }
      : {}),
    font: ctx.font,
    ...(extra?.lineIndex !== undefined ? { lineIndex: extra.lineIndex } : {}),
    ...(extra?.line !== undefined ? { line: extra.line } : {}),
  });
}

/**
 * 版型框 auto-fit：依 placementRect 與 glyph 外框計算等比縮放。
 * keepRatio:false 時以固定基準字級量測，targetFontSize 不受 layer.fontSize_cm 限制。
 * 不修改 layer.fontSize_cm，僅供 render 使用。
 */
export function computeRichTextPrintUniformScale(
  layer: TextDesignLayer,
  placementRect: { width_cm: number; height_cm: number },
  pxPerCm: number = getOverlayPxPerCm(),
): number {
  return computeRichTextAutoFitScales(layer, placementRect, pxPerCm)
    .uniformScale;
}

/** 版型框內 render 字級（cm）；不寫回 layer state */
export function computeRichTextAutoFitFontSize_cm(
  layer: TextDesignLayer,
  placementRect: { width_cm: number; height_cm: number },
  pxPerCm: number = getOverlayPxPerCm(),
): number {
  return computeRichTextAutoFitScales(layer, placementRect, pxPerCm)
    .targetFontSize_cm;
}

/** DesignCanvas 預覽與 Mockup／印刷匯出共用的文字縮放指標 */
export function getRichTextRenderMetrics(
  layer: TextDesignLayer,
  placementRect: { width_cm: number; height_cm: number },
  pxPerCm: number = getOverlayPxPerCm(),
): RichTextRenderMetrics {
  const style = normalizeRichTextFields(layer);
  const scales = computeRichTextAutoFitScales(layer, placementRect, pxPerCm);
  const uniformScale = scales.uniformScale;
  const fontSize_cm = scales.autoFitEnabled
    ? scales.targetFontSize_cm
    : layer.fontSize_cm * layer.scale;

  return {
    uniformScale,
    fontSize_cm,
    letterSpacing_cm: style.letterSpacing_cm * uniformScale,
    strokeWidth_cm: (style.stroke?.width_cm ?? 0) * uniformScale,
    shadow: style.shadow
      ? {
          ...style.shadow,
          blur_cm: style.shadow.blur_cm * uniformScale,
          offsetX_cm: style.shadow.offsetX_cm * uniformScale,
          offsetY_cm: style.shadow.offsetY_cm * uniformScale,
        }
      : null,
  };
}

export interface DrawRichTextOnCanvasDebugInfo {
  layerId: string;
  text: string;
  keepRatio: boolean | undefined;
  autoFitEnabled: boolean;
  layerFontSize_cm: number;
  layerScale: number;
  placementRect: { width_cm: number; height_cm: number };
  glyph: { width_cm: number; height_cm: number };
  uniformScale: number;
  renderFontSize_cm: number;
  pxPerCm: number;
  fontSizePx: number;
  layerFontSizePx: number;
  ctxFont: string;
  usesRenderFontSize: boolean;
}

export function logDrawRichTextOnCanvasDebug(
  info: DrawRichTextOnCanvasDebugInfo,
): void {
  if (typeof console === "undefined") return;
  console.log("[drawRichTextOnCanvas]", {
    layerId: info.layerId,
    text: info.text,
    keepRatio: info.keepRatio,
    autoFitEnabled: info.autoFitEnabled,
    layerFontSize_cm: info.layerFontSize_cm,
    layerScale: info.layerScale,
    placementRect: info.placementRect,
    glyph: info.glyph,
    uniformScale: info.uniformScale,
    renderFontSize_cm: info.renderFontSize_cm,
    fontSizePx: info.fontSizePx,
    layerFontSizePx: info.layerFontSizePx,
    ctxFont: info.ctxFont,
    usesRenderFontSize: info.usesRenderFontSize,
  });
}

export function getRichTextDomStyle(
  layer: TextDesignLayer,
  placementRect: { width_cm: number; height_cm: number },
): CSSProperties {
  const style = normalizeRichTextFields(layer);
  const metrics = getRichTextRenderMetrics(
    layer,
    placementRect,
    getOverlayPxPerCm(),
  );
  const boxHeight_cm = Math.max(placementRect.height_cm, 1e-6);
  const stroke = style.stroke;
  const shadow = metrics.shadow;

  const previewPx = (cm: number) => cm * getOverlayPxPerCm();

  const textShadow = shadow
    ? `${previewPx(shadow.offsetX_cm)}px ${previewPx(shadow.offsetY_cm)}px ${previewPx(shadow.blur_cm)}px ${shadow.color}`
    : undefined;

  const webkitTextStroke =
    stroke && metrics.strokeWidth_cm > 0
      ? `${previewPx(metrics.strokeWidth_cm)}px ${stroke.color}`
      : undefined;

  return {
    fontFamily: resolveCssFontFamily(layer.fontFamily),
    fontSize: `calc(${metrics.fontSize_cm / boxHeight_cm} * 100cqh)`,
    lineHeight: style.lineHeight,
    letterSpacing: `${(metrics.letterSpacing_cm / Math.max(metrics.fontSize_cm, 1e-6))}em`,
    fontWeight: layer.fontWeight,
    fontStyle: style.fontStyle,
    color: layer.color,
    opacity: layer.opacity,
    textAlign: style.textAlign,
    whiteSpace: "pre-wrap",
    width: "100%",
    textShadow,
    WebkitTextStroke: webkitTextStroke,
  } as CSSProperties;
}

export function drawRichTextOnCanvas(
  ctx: CanvasRenderingContext2D,
  layer: TextDesignLayer,
  pxPerCm: number,
  rect: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
  pxPerCmY: number = pxPerCm,
  options?: {
    skipRotation?: boolean;
    /** auto-fit 用印刷框；未指定時使用 rect 的 width_cm / height_cm */
    placementRect?: { width_cm: number; height_cm: number };
  },
) {
  if (typeof console !== "undefined") {
    console.log("[drawRichTextOnCanvas entry]", {
      layerId: layer.id,
      text: layer.text,
      rect,
      pxPerCm: roundDebug(pxPerCm),
      pxPerCmY: roundDebug(pxPerCmY),
      placementRect: options?.placementRect,
      skipRotation: options?.skipRotation,
      ctxTransform: serializeCanvasTransform(ctx),
    });
  }

  const style = normalizeRichTextFields(layer);
  const placementRect = options?.placementRect ?? {
    width_cm: rect.width_cm,
    height_cm: rect.height_cm,
  };
  const baseFontSize_cm = layer.fontSize_cm * layer.scale;
  const metrics = getRichTextRenderMetrics(layer, placementRect, pxPerCm);
  const fontSizePx = metrics.fontSize_cm * pxPerCm;
  const layerFontSizePx = baseFontSize_cm * pxPerCm;
  const baseFontSizePx = baseFontSize_cm * pxPerCm;
  const autoFitDebug = computeRichTextAutoFitDebug(layer, placementRect, pxPerCm);
  const lines = (layer.text || "").split("\n");
  const lineHeightPx = fontSizePx * style.lineHeight;
  const letterSpacingPx = metrics.letterSpacing_cm * pxPerCm;

  const boxLeft = rect.x_cm * pxPerCm;
  const boxTop = rect.y_cm * pxPerCmY;
  const boxWidth = rect.width_cm * pxPerCm;
  const boxHeight = rect.height_cm * pxPerCmY;
  const rectWidthPx = rect.width_cm * pxPerCm;
  const rectHeightPx = rect.height_cm * pxPerCmY;
  const centerX = boxLeft + boxWidth / 2;
  const centerY = boxTop + boxHeight / 2;
  const blockHeight = lineHeightPx * lines.length;
  const startY = centerY - blockHeight / 2 + lineHeightPx / 2;

  ctx.save();
  if (!options?.skipRotation) {
    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }
  ctx.globalAlpha = layer.opacity;

  const ctxFont = buildRichCanvasFont(
    {
      fontWeight: layer.fontWeight,
      fontFamily: layer.fontFamily,
      fontStyle: style.fontStyle,
    },
    fontSizePx,
  );
  ctx.font = ctxFont;

  logAutoFitDebug(autoFitDebug, {
    text: layer.text,
    keepRatio: layer.keepRatio,
    layerFontSize_cm: layer.fontSize_cm,
    measureFontSize_cm: roundDebug(autoFitDebug.measureFontSize_cm),
    targetFontSize_cm: roundDebug(autoFitDebug.targetFontSize_cm),
    baseFontSizePx: roundDebug(baseFontSizePx),
    placementWidth_cm: placementRect.width_cm,
    placementHeight_cm: placementRect.height_cm,
    renderFontSize_cm: roundDebug(metrics.fontSize_cm),
    fontSizePx: roundDebug(fontSizePx),
    layerFontSizePx: roundDebug(layerFontSizePx),
    ctxFont,
    glyphMatchesAfterFillTextPx: roundDebug(autoFitDebug.glyphWidthPx),
  });

  logDrawRichTextOnCanvasDebug({
    layerId: layer.id,
    text: layer.text,
    keepRatio: layer.keepRatio,
    autoFitEnabled: autoFitDebug.autoFitEnabled,
    layerFontSize_cm: layer.fontSize_cm,
    layerScale: layer.scale,
    placementRect,
    glyph: {
      width_cm: autoFitDebug.glyphWidthCm,
      height_cm: autoFitDebug.glyphHeightCm,
    },
    uniformScale: metrics.uniformScale,
    renderFontSize_cm: metrics.fontSize_cm,
    pxPerCm,
    fontSizePx,
    layerFontSizePx,
    ctxFont,
    usesRenderFontSize: Math.abs(fontSizePx - layerFontSizePx) > 0.01,
  });

  ctx.textBaseline = "middle";

  if (metrics.shadow) {
    ctx.shadowColor = metrics.shadow.color;
    ctx.shadowBlur = metrics.shadow.blur_cm * pxPerCm;
    ctx.shadowOffsetX = metrics.shadow.offsetX_cm * pxPerCm;
    ctx.shadowOffsetY = metrics.shadow.offsetY_cm * pxPerCmY;
  }

  lines.forEach((line, index) => {
    const y = startY + index * lineHeightPx;
    let x = boxLeft;
    if (style.textAlign === "center") x = boxLeft + boxWidth / 2;
    if (style.textAlign === "right") x = boxLeft + boxWidth;

    ctx.textAlign = style.textAlign;
    if (letterSpacingPx === 0) {
      ctx.fillStyle = layer.color;
      logBeforeFillText(ctx, {
        drawX: x,
        drawY: y,
        boxWidthPx: boxWidth,
        boxHeightPx: boxHeight,
        rectWidthCm: rect.width_cm,
        rectHeightCm: rect.height_cm,
        rectWidthPx,
        rectHeightPx,
        lineIndex: index,
        line,
      });
      ctx.fillText(line, x, y);
      logAfterFillTextMetrics(ctx, line, {
        lineIndex: index,
        line,
        pxPerCm,
        expectedWidthPxAtBase: autoFitDebug.glyphWidthPx,
        expectedWidthPxAtRender:
          autoFitDebug.glyphWidthPx * metrics.uniformScale,
      });
      if (style.stroke && metrics.strokeWidth_cm > 0) {
        ctx.strokeStyle = style.stroke.color;
        ctx.lineWidth = metrics.strokeWidth_cm * pxPerCm;
        ctx.strokeText(line, x, y);
      }
      return;
    }

    const chars = [...line];
    const widths = chars.map((ch) => ctx.measureText(ch).width);
    const totalWidth =
      widths.reduce((a, b) => a + b, 0) +
      letterSpacingPx * Math.max(chars.length - 1, 0);
    let cursor =
      style.textAlign === "center"
        ? x - totalWidth / 2
        : style.textAlign === "right"
          ? x - totalWidth
          : x;

    ctx.textAlign = "left";
    chars.forEach((ch, i) => {
      ctx.fillStyle = layer.color;
      if (i === 0) {
        logBeforeFillText(ctx, {
          drawX: cursor,
          drawY: y,
          boxWidthPx: boxWidth,
          boxHeightPx: boxHeight,
          rectWidthCm: rect.width_cm,
          rectHeightCm: rect.height_cm,
          rectWidthPx,
          rectHeightPx,
          lineIndex: index,
          line,
        });
      }
      ctx.fillText(ch, cursor, y);
      if (style.stroke && metrics.strokeWidth_cm > 0) {
        ctx.strokeStyle = style.stroke.color;
        ctx.lineWidth = metrics.strokeWidth_cm * pxPerCm;
        ctx.strokeText(ch, cursor, y);
      }
      cursor += widths[i]! + letterSpacingPx;
    });
    logAfterFillTextMetrics(ctx, line, {
      lineIndex: index,
      line,
      pxPerCm,
      expectedWidthPxAtBase: autoFitDebug.glyphWidthPx,
      expectedWidthPxAtRender:
        autoFitDebug.glyphWidthPx * metrics.uniformScale,
    });
  });

  ctx.restore();
}

function buildRichCanvasFont(
  layer: Pick<
    TextDesignLayer,
    "fontWeight" | "fontFamily" | "fontStyle"
  >,
  fontSizePx: number,
): string {
  const base = buildCanvasFont(layer.fontWeight, fontSizePx, layer.fontFamily);
  if (layer.fontStyle === "italic") {
    return `italic ${base}`;
  }
  return base;
}

export function serializeRichTextFields(layer: TextDesignLayer) {
  return {
    fontStyle: layer.fontStyle,
    letterSpacing_cm: layer.letterSpacing_cm,
    lineHeight: layer.lineHeight,
    textAlign: layer.textAlign,
    stroke: layer.stroke,
    shadow: layer.shadow,
  };
}
