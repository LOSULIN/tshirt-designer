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

export function resolveFontFamily(fontFamily: TextFontFamily): string {
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

  ctx.font = `${fontWeight} ${fontSizePx}px ${resolveFontFamily(fontFamily)}`;
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
    layers.map((layer) =>
      document.fonts.load(
        `${layer.fontWeight} ${cmToUiPx(layer.fontSize_cm * layer.scale)}px ${resolveFontFamily(layer.fontFamily)}`,
      ),
    ),
  );
}
