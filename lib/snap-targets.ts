import { getLayerEffectiveCmRect } from "./design-cm";
import type { SnapTarget } from "./element-snap";
import type { DesignLayer } from "./types";

export function buildSnapTargetsFromLayers(
  activeLayerId: string,
  layers: DesignLayer[],
): SnapTarget[] {
  return layers
    .filter((l) => l.id !== activeLayerId && l.visible && !l.locked)
    .map((layer) => {
      const rect = getLayerEffectiveCmRect(layer);
      return {
        id: layer.id,
        x: rect.x_cm,
        y: rect.y_cm,
        width: rect.width_cm,
        height: rect.height_cm,
        scale: 1,
      };
    });
}

/** @deprecated 使用 buildSnapTargetsFromLayers */
export function buildSnapTargets(
  activeLayerId: string,
  cf: {
    x_cm: number;
    y_cm: number;
    width_cm: number;
    height_cm: number;
    scale: number;
  } | null,
  textLayers: {
    id: string;
    x_cm: number;
    y_cm: number;
    width_cm: number;
    height_cm: number;
  }[],
): SnapTarget[] {
  const targets: SnapTarget[] = [];

  if (cf && activeLayerId !== "cf") {
    targets.push({
      id: "cf",
      x: cf.x_cm,
      y: cf.y_cm,
      width: cf.width_cm,
      height: cf.height_cm,
      scale: cf.scale,
    });
  }

  for (const layer of textLayers) {
    if (layer.id === activeLayerId) continue;
    targets.push({
      id: layer.id,
      x: layer.x_cm,
      y: layer.y_cm,
      width: layer.width_cm,
      height: layer.height_cm,
      scale: 1,
    });
  }

  return targets;
}
