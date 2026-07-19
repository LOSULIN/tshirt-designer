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
import { DESIGNER_DEFAULTS } from "./designer-defaults";

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

/** 字型量測外框（export／校稿／印刷尺寸） */
export function getTextLayerMeasuredCmRect(layer: TextDesignLayer): LayerCmRect {
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

/** 畫布／Inspector 定位用外框 */
export function getTextLayerPlacementCmRect(layer: TextDesignLayer): LayerCmRect {
  if (layer.keepRatio === false) {
    return {
      x_cm: layer.x_cm,
      y_cm: layer.y_cm,
      width_cm: layer.width_cm,
      height_cm: layer.height_cm,
    };
  }
  return getTextLayerMeasuredCmRect(layer);
}

/**
 * Mockup／匯出用外框：與 image layer 相同，以 layer state 的印刷框 cm 為準。
 * keepRatio:false 或 stored 框明顯大於 glyph 量測時，使用 width_cm / height_cm。
 */
export function getTextLayerExportCmRect(layer: TextDesignLayer): LayerCmRect {
  if (layer.keepRatio === false) {
    return {
      x_cm: layer.x_cm,
      y_cm: layer.y_cm,
      width_cm: layer.width_cm,
      height_cm: layer.height_cm,
    };
  }

  const measured = getTextLayerMeasuredCmRect(layer);
  const storedLooksLikePlacementBox =
    layer.width_cm > measured.width_cm * 1.05 ||
    layer.height_cm > measured.height_cm * 1.05;

  if (storedLooksLikePlacementBox) {
    return {
      x_cm: layer.x_cm,
      y_cm: layer.y_cm,
      width_cm: layer.width_cm,
      height_cm: layer.height_cm,
    };
  }

  return measured;
}

/** @deprecated 請用 getTextLayerMeasuredCmRect（export）或 getTextLayerPlacementCmRect（UI） */
export function getTextLayerCmRect(layer: TextDesignLayer): LayerCmRect {
  return getTextLayerMeasuredCmRect(layer);
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
  const fontSize_cm = DESIGNER_DEFAULTS.text.fontSize_cm;
  const fontFamily: TextFontFamily = "Inter";
  const fontWeight = DESIGNER_DEFAULTS.text.fontWeight;
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

export function serializeTextLayer(layer: TextLayer & { keepRatio?: boolean }) {
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
    keepRatio: layer.keepRatio,
  };
}

export async function ensureTextFontsLoaded(
  layers: TextLayer[],
  options?: {
    /** Mockup／匯出：依 placement + uniformScale 後的實際字級載入字型 */
    getRenderFontSize_cm?: (layer: TextDesignLayer) => number;
  },
) {
  if (typeof document === "undefined" || !document.fonts) return;

  await Promise.all(
    layers.map(async (layer) => {
      const fontSize_cm =
        options?.getRenderFontSize_cm?.(layer as TextDesignLayer) ??
        layer.fontSize_cm * layer.scale;
      const font = buildCanvasFont(
        layer.fontWeight,
        cmToUiPx(fontSize_cm),
        layer.fontFamily,
      );
      try {
        await document.fonts.load(font);
      } catch {
        const fallback = buildCanvasFont(
          layer.fontWeight,
          cmToUiPx(fontSize_cm),
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
