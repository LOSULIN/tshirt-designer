import type { DesignLayer, ImageDesignLayer, ShapeDesignLayer } from "@/lib/types";

function nextNumberedName(base: string, existingNames: Set<string>): string {
  if (!existingNames.has(base)) return base;
  let index = 2;
  while (existingNames.has(`${base}${index}`)) {
    index += 1;
  }
  return `${base}${index}`;
}

function imageBaseLabel(layer: ImageDesignLayer): string {
  const fileName = layer.image.fileName.toLowerCase();
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  if (fileName.endsWith(".svg")) return "SVG";
  if (base.includes("logo")) return "Logo";
  if (base.includes("banner")) return "Banner";
  if (/^img[_\-\s]?\d+/i.test(base) || /^dsc\d+/i.test(base)) return "圖片";
  return "圖片";
}

function shapeBaseLabel(layer: ShapeDesignLayer): string {
  if (layer.shapeKind === "rectangle") return "矩形";
  if (layer.shapeKind === "circle") return "圓形";
  if (layer.shapeKind === "line") return "線條";
  return "圖形";
}

/** UI-only auto naming when appending layers (does not change schema) */
export function resolveAutoLayerName(
  layer: DesignLayer,
  existingLayers: DesignLayer[],
): string {
  const names = new Set(existingLayers.map((item) => item.name));

  if (layer.type === "text") {
    return nextNumberedName("文字", names);
  }

  if (layer.type === "image") {
    return nextNumberedName(imageBaseLabel(layer), names);
  }

  return nextNumberedName(shapeBaseLabel(layer), names);
}

export function withAutoLayerName<T extends DesignLayer>(
  layer: T,
  existingLayers: DesignLayer[],
): T {
  return { ...layer, name: resolveAutoLayerName(layer, existingLayers) };
}
