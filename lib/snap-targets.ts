import type { SnapTarget } from "./element-snap";
import type { DesignLayer } from "./types";

export function buildSnapTargetsFromLayers(
  activeLayerId: string,
  layers: DesignLayer[],
): SnapTarget[] {
  return layers
    .filter((l) => l.id !== activeLayerId && l.visible && !l.locked)
    .map((layer) => ({
      id: layer.id,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      scale: layer.type === "image" ? layer.scale : 1,
    }));
}

/** @deprecated 使用 buildSnapTargetsFromLayers */
export function buildSnapTargets(
  activeLayerId: string,
  image: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  } | null,
  textLayers: { id: string; x: number; y: number; width: number; height: number }[],
): SnapTarget[] {
  const targets: SnapTarget[] = [];

  if (image && activeLayerId !== "image") {
    targets.push({
      id: "image",
      x: image.x,
      y: image.y,
      width: image.width,
      height: image.height,
      scale: image.scale,
    });
  }

  for (const layer of textLayers) {
    if (layer.id === activeLayerId) continue;
    targets.push({
      id: layer.id,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      scale: 1,
    });
  }

  return targets;
}
