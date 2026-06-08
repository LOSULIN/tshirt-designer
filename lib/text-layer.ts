import { PRINT_AREA } from "./constants";
import type { TextFontFamily, TextLayer } from "./types";
import { nanoid } from "nanoid";

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

export function measureTextBounds(
  text: string,
  fontSize: number,
  fontFamily: TextFontFamily,
  fontWeight: number,
): { width: number; height: number } {
  if (typeof document === "undefined") {
    return {
      width: Math.max(text.length * fontSize * 0.55, fontSize),
      height: fontSize * 1.3,
    };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: fontSize * 4, height: fontSize * 1.3 };
  }

  ctx.font = `${fontWeight} ${fontSize}px ${resolveFontFamily(fontFamily)}`;
  const metrics = ctx.measureText(text || " ");
  return {
    width: Math.ceil(metrics.width) + 12,
    height: Math.ceil(fontSize * 1.3),
  };
}

export function createDefaultTextLayer(): TextLayer {
  const fontSize = 48;
  const fontFamily: TextFontFamily = "Inter";
  const fontWeight = 400;
  const { width, height } = measureTextBounds(
    " ",
    fontSize,
    fontFamily,
    fontWeight,
  );

  return {
    id: nanoid(),
    type: "text",
    text: "",
    fontSize,
    fontFamily,
    color: "#000000",
    opacity: 1,
    fontWeight,
    rotation: 0,
    scale: 1,
    x: (PRINT_AREA.width - width) / 2,
    y: (PRINT_AREA.height - height) / 2,
    width,
    height,
  };
}

export function serializeTextLayer(layer: TextLayer) {
  return {
    id: layer.id,
    type: "text" as const,
    text: layer.text,
    fontSize: layer.fontSize,
    fontFamily: layer.fontFamily,
    color: layer.color,
    opacity: layer.opacity,
    fontWeight: layer.fontWeight,
    rotation: layer.rotation,
    scale: layer.scale,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
  };
}

export async function ensureTextFontsLoaded(layers: TextLayer[]) {
  if (typeof document === "undefined" || !document.fonts) return;

  await Promise.all(
    layers.map((layer) =>
      document.fonts.load(
        `${layer.fontWeight} ${layer.fontSize * layer.scale}px ${resolveFontFamily(layer.fontFamily)}`,
      ),
    ),
  );
}
