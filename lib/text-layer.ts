import {
  cmToUiPx,
  getPrintAreaCmBounds,
  type LayerCmRect,
  type PrintAreaCmBounds,
} from "./design-cm";
import {
  DEFAULT_RICH_TEXT_FIELDS,
  measureRichTextBoundsCm,
} from "./text-style";
import type { TextFontFamily, TextLayer, TextDesignLayer } from "./types";
import { nanoid } from "nanoid";

export const DEFAULT_NEW_TEXT = "TEST";

export const TEXT_FONT_OPTIONS: { label: TextFontFamily; value: TextFontFamily }[] =
  [
    { label: "Arial", value: "Arial" },
    { label: "Inter", value: "Inter" },
    { label: "Roboto", value: "Roboto" },
    { label: "Noto Sans TC", value: "Noto Sans TC" },
  ];

const CSS_FONT_VAR: Partial<Record<TextFontFamily, string>> = {
  Inter: "--font-inter",
  Roboto: "--font-roboto",
  "Noto Sans TC": "--font-noto-sans-tc",
};

const CANVAS_FONT_FALLBACK: Record<TextFontFamily, string> = {
  Inter: "Inter",
  Roboto: "Roboto",
  "Noto Sans TC": '"Noto Sans TC"',
  Arial: "Arial",
};

/** DOM / CSS — 可使用 Next.js font variable */
export function resolveCssFontFamily(fontFamily: TextFontFamily): string {
  switch (fontFamily) {
    case "Inter":
      return "var(--font-inter), Inter, sans-serif";
    case "Roboto":
      return "var(--font-roboto), Roboto, sans-serif";
    case "Noto Sans TC":
      return "var(--font-noto-sans-tc), 'Noto Sans TC', sans-serif";
    case "Arial":
    default:
      return "Arial, Helvetica, sans-serif";
  }
}

/** @deprecated 使用 resolveCssFontFamily（DOM）或 resolveCanvasFontFamily（Canvas） */
export function resolveFontFamily(fontFamily: TextFontFamily): string {
  return resolveCssFontFamily(fontFamily);
}

function readResolvedCssFontFamily(cssVar: string): string | null {
  if (typeof document === "undefined") return null;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar)
    .trim();
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "");
  return first || null;
}

/** Canvas / document.fonts.load — 不可含 var() */
export function resolveCanvasFontFamily(fontFamily: TextFontFamily): string {
  const cssVar = CSS_FONT_VAR[fontFamily];
  if (cssVar) {
    const resolved = readResolvedCssFontFamily(cssVar);
    if (resolved) return resolved;
  }
  return CANVAS_FONT_FALLBACK[fontFamily] ?? "Arial";
}

export function buildCanvasFont(
  fontWeight: number,
  fontSizePx: number,
  fontFamily: TextFontFamily,
): string {
  return `${fontWeight} ${fontSizePx}px ${resolveCanvasFontFamily(fontFamily)}`;
}

/** 文字圖層幾何：以 fontSize×scale 量測 glyph bounds，搭配儲存的 x/y */
export function getTextLayerCmRect(layer: TextDesignLayer): LayerCmRect {
  const fontSize_cm = layer.fontSize_cm * layer.scale;
  const { width_cm, height_cm } = measureTextBoundsCm(
    layer.text,
    fontSize_cm,
    layer.fontFamily,
    layer.fontWeight,
    layer,
  );
  return {
    x_cm: layer.x_cm,
    y_cm: layer.y_cm,
    width_cm,
    height_cm,
  };
}

export function measureTextBoundsCm(
  text: string,
  fontSize_cm: number,
  fontFamily: TextFontFamily,
  fontWeight: number,
  style?: Partial<
    Pick<
      TextDesignLayer,
      "fontStyle" | "letterSpacing_cm" | "lineHeight"
    >
  >,
): { width_cm: number; height_cm: number } {
  return measureRichTextBoundsCm(
    {
      text,
      fontSize_cm,
      fontFamily,
      fontWeight,
      fontStyle: style?.fontStyle ?? DEFAULT_RICH_TEXT_FIELDS.fontStyle,
      letterSpacing_cm:
        style?.letterSpacing_cm ?? DEFAULT_RICH_TEXT_FIELDS.letterSpacing_cm,
      lineHeight: style?.lineHeight ?? DEFAULT_RICH_TEXT_FIELDS.lineHeight,
    },
    fontSize_cm,
  );
}

export function createDefaultTextLayer(
  printArea?: PrintAreaCmBounds,
): TextLayer {
  const area = printArea ?? getPrintAreaCmBounds();
  const fontSize_cm = 4.8;
  const fontFamily: TextFontFamily = "Inter";
  const fontWeight = 400;
  const { width_cm, height_cm } = measureTextBoundsCm(
    DEFAULT_NEW_TEXT,
    fontSize_cm,
    fontFamily,
    fontWeight,
  );

  return {
    id: nanoid(),
    type: "text",
    text: DEFAULT_NEW_TEXT,
    fontSize_cm,
    fontFamily,
    color: "#000000",
    opacity: 1,
    fontWeight,
    rotation: 0,
    scale: 1,
    x_cm: (area.width - width_cm) / 2,
    y_cm: (area.height - height_cm) / 2,
    width_cm,
    height_cm,
  };
}

export function serializeTextLayer(layer: TextLayer) {
  return {
    id: layer.id,
    type: "text" as const,
    text: layer.text,
    fontSize_cm: layer.fontSize_cm,
    fontFamily: layer.fontFamily,
    color: layer.color,
    opacity: layer.opacity,
    fontWeight: layer.fontWeight,
    rotation: layer.rotation,
    scale: layer.scale,
    x_cm: layer.x_cm,
    y_cm: layer.y_cm,
    width_cm: layer.width_cm,
    height_cm: layer.height_cm,
  };
}

export async function ensureTextFontsLoaded(layers: TextLayer[]) {
  if (typeof document === "undefined" || !document.fonts) return;

  await Promise.all(
    layers.map(async (layer) => {
      const font = buildCanvasFont(
        layer.fontWeight,
        cmToUiPx(layer.fontSize_cm * layer.scale),
        layer.fontFamily,
      );
      try {
        await document.fonts.load(font);
      } catch {
        const fallback = buildCanvasFont(
          layer.fontWeight,
          cmToUiPx(layer.fontSize_cm * layer.scale),
          "Arial",
        );
        try {
          await document.fonts.load(fallback);
        } catch {
          // 略過無法載入的字體，避免阻斷匯出／送出
        }
      }
    }),
  );
}
