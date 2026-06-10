import type { PrintAreaCmBounds } from "./design-cm";
import { fitLayerTransform } from "./geometry";
import { measureTextBoundsCm } from "./text-layer";
import type { DesignLayer, ImageDesignLayer, TextDesignLayer } from "./types";

export function fitImageLayer(
  layer: ImageDesignLayer,
  printArea: PrintAreaCmBounds,
): ImageDesignLayer {
  const fitted = fitLayerTransform(
    layer.x_cm,
    layer.y_cm,
    layer.width_cm,
    layer.height_cm,
    layer.scale,
    layer.rotation,
    printArea,
  );

  return { ...layer, x_cm: fitted.x, y_cm: fitted.y, scale: fitted.scale };
}

export function fitTextLayer(
  layer: TextDesignLayer,
  printArea: PrintAreaCmBounds,
): TextDesignLayer {
  const fontSize_cm = layer.fontSize_cm * layer.scale;
  const { width_cm, height_cm } = measureTextBoundsCm(
    layer.text,
    fontSize_cm,
    layer.fontFamily,
    layer.fontWeight,
  );
  const fitted = fitLayerTransform(
    layer.x_cm,
    layer.y_cm,
    width_cm,
    height_cm,
    1,
    layer.rotation,
    printArea,
  );

  return {
    ...layer,
    fontSize_cm,
    scale: 1,
    width_cm,
    height_cm,
    x_cm: fitted.x,
    y_cm: fitted.y,
  };
}

export function fitDesignLayer(
  layer: DesignLayer,
  printArea: PrintAreaCmBounds,
): DesignLayer {
  return layer.type === "text"
    ? fitTextLayer(layer, printArea)
    : fitImageLayer(layer, printArea);
}

export function fitDesignLayers(
  layers: DesignLayer[],
  printArea: PrintAreaCmBounds,
): DesignLayer[] {
  return layers.map((layer) => fitDesignLayer(layer, printArea));
}
