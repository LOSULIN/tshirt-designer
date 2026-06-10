import {
  cmToUiPx,
  getPrintAreaCmBounds,
  uiPxToCm,
  type PrintAreaCmBounds,
} from "./design-cm";
import type { TextFontFamily, TextLayer } from "./types";
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

export function measureTextBoundsCm(
  text: string,
  fontSize_cm: number,
  fontFamily: TextFontFamily,
  fontWeight: number,
): { width_cm: number; height_cm: number } {
  const fontSizePx = cmToUiPx(fontSize_cm);

  if (typeof document === "undefined") {
    return {
      width_cm: Math.max(uiPxToCm(text.length * fontSizePx * 0.55), fontSize_cm),
      height_cm: uiPxToCm(fontSizePx * 1.3),
    };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width_cm: fontSize_cm * 4, height_cm: fontSize_cm * 1.3 };
  }

  ctx.font = buildCanvasFont(fontWeight, fontSizePx, fontFamily);
  const metrics = ctx.measureText(text || " ");
  return {
    width_cm: uiPxToCm(Math.ceil(metrics.width) + 12),
    height_cm: uiPxToCm(Math.ceil(fontSizePx * 1.3)),
  };
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
