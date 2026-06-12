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
): { width_cm: number; height_cm: number } {
  const style = normalizeRichTextFields(layer);
  const pxPerCm = getOverlayPxPerCm();
  const fontSizePx = fontSize_cm * pxPerCm;
  const lines = (layer.text || " ").split("\n");
  const letterSpacingPx = style.letterSpacing_cm * pxPerCm;

  if (typeof document === "undefined") {
    const maxLen = Math.max(...lines.map((l) => l.length), 1);
    return {
      width_cm: Math.max(
        (maxLen * fontSizePx * 0.55 + 12) / pxPerCm,
        fontSize_cm,
      ),
      height_cm: (fontSizePx * style.lineHeight * lines.length) / pxPerCm,
    };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width_cm: fontSize_cm * 4, height_cm: fontSize_cm * 1.3 };
  }

  ctx.font = buildRichCanvasFont(
    {
      fontWeight: layer.fontWeight,
      fontFamily: layer.fontFamily,
      fontStyle: style.fontStyle,
    },
    fontSizePx,
  );

  let maxWidthPx = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line || " ");
    const extra =
      line.length > 1 ? letterSpacingPx * (line.length - 1) : 0;
    maxWidthPx = Math.max(maxWidthPx, metrics.width + extra);
  }

  const lineHeightPx = fontSizePx * style.lineHeight;
  return {
    width_cm: (Math.ceil(maxWidthPx) + 12) / pxPerCm,
    height_cm: (Math.ceil(lineHeightPx * lines.length)) / pxPerCm,
  };
}

export function getRichTextDomStyle(
  layer: TextDesignLayer,
  printAreaHeightCm: number,
): CSSProperties {
  const style = normalizeRichTextFields(layer);
  const fontSize_cm = layer.fontSize_cm * layer.scale;
  const stroke = style.stroke;
  const shadow = style.shadow;

  const previewPx = (cm: number) => cm * getOverlayPxPerCm();

  const textShadow = shadow
    ? `${previewPx(shadow.offsetX_cm)}px ${previewPx(shadow.offsetY_cm)}px ${previewPx(shadow.blur_cm)}px ${shadow.color}`
    : undefined;

  const webkitTextStroke =
    stroke && stroke.width_cm > 0
      ? `${previewPx(stroke.width_cm)}px ${stroke.color}`
      : undefined;

  return {
    fontFamily: resolveCssFontFamily(layer.fontFamily),
    fontSize: `calc(${fontSize_cm / printAreaHeightCm} * 100cqh)`,
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing_cm}cm`,
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
) {
  const style = normalizeRichTextFields(layer);
  const fontSize_cm = layer.fontSize_cm * layer.scale;
  const fontSizePx = fontSize_cm * pxPerCm;
  const lines = (layer.text || "").split("\n");
  const lineHeightPx = fontSizePx * style.lineHeight;
  const letterSpacingPx = style.letterSpacing_cm * pxPerCm;

  const centerX = (rect.x_cm + rect.width_cm / 2) * pxPerCm;
  const centerY = (rect.y_cm + rect.height_cm / 2) * pxPerCm;
  const blockHeight = lineHeightPx * lines.length;
  const startY = centerY - blockHeight / 2 + lineHeightPx / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);
  ctx.globalAlpha = layer.opacity;

  ctx.font = buildRichCanvasFont(
    {
      fontWeight: layer.fontWeight,
      fontFamily: layer.fontFamily,
      fontStyle: style.fontStyle,
    },
    fontSizePx,
  );
  ctx.textBaseline = "middle";

  if (style.shadow) {
    ctx.shadowColor = style.shadow.color;
    ctx.shadowBlur = style.shadow.blur_cm * pxPerCm;
    ctx.shadowOffsetX = style.shadow.offsetX_cm * pxPerCm;
    ctx.shadowOffsetY = style.shadow.offsetY_cm * pxPerCm;
  }

  const boxLeft = rect.x_cm * pxPerCm;
  const boxWidth = rect.width_cm * pxPerCm;

  lines.forEach((line, index) => {
    const y = startY + index * lineHeightPx;
    let x = boxLeft;
    if (style.textAlign === "center") x = boxLeft + boxWidth / 2;
    if (style.textAlign === "right") x = boxLeft + boxWidth;

    ctx.textAlign = style.textAlign;
    if (letterSpacingPx === 0) {
      ctx.fillStyle = layer.color;
      ctx.fillText(line, x, y);
      if (style.stroke && style.stroke.width_cm > 0) {
        ctx.strokeStyle = style.stroke.color;
        ctx.lineWidth = style.stroke.width_cm * pxPerCm;
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
      ctx.fillText(ch, cursor, y);
      if (style.stroke && style.stroke.width_cm > 0) {
        ctx.strokeStyle = style.stroke.color;
        ctx.lineWidth = style.stroke.width_cm * pxPerCm;
        ctx.strokeText(ch, cursor, y);
      }
      cursor += widths[i]! + letterSpacingPx;
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
