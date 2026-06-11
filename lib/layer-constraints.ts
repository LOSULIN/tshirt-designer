import type { LayerCmRect, PrintAreaCmBounds } from "./design-cm";
import type { SnapTarget } from "./element-snap";
import {
  getMaxImageScaleForPrintLimit,
  type FitRasterImageOptions,
} from "./image-print-quality";
import { applyDragSnap, fitLayerTransform, LAYER_MAX_SCALE } from "./geometry";
import { getTextLayerCmRect } from "./text-layer";
import type {
  DesignLayer,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "./types";

export function fitImageLayer(
  layer: ImageDesignLayer,
  printArea: PrintAreaCmBounds,
  options?: FitRasterImageOptions,
): ImageDesignLayer {
  let maxScale = LAYER_MAX_SCALE;
  if (options) {
    maxScale = getMaxImageScaleForPrintLimit(
      layer.width_cm,
      layer.height_cm,
      options.maxPrintWidth_cm,
      options.maxPrintHeight_cm,
      maxScale,
    );
  }

  const fitted = fitLayerTransform(
    layer.x_cm,
    layer.y_cm,
    layer.width_cm,
    layer.height_cm,
    layer.scale,
    layer.rotation,
    printArea,
    { maxScale },
  );

  return { ...layer, x_cm: fitted.x, y_cm: fitted.y, scale: fitted.scale };
}

export interface FitTextLayerOptions {
  /** Resize 期間固定不動的中心（與 PrintAreaElement 起點 effective rect 一致） */
  anchorCenter?: Pick<LayerCmRect, "x_cm" | "y_cm">;
}

export function fitTextLayer(
  layer: TextDesignLayer,
  printArea: PrintAreaCmBounds,
  options?: FitTextLayerOptions,
): TextDesignLayer {
  const fontSize_cm = layer.fontSize_cm * layer.scale;
  const { width_cm, height_cm } = getTextLayerCmRect(layer);

  let x_cm = layer.x_cm;
  let y_cm = layer.y_cm;
  const anchorCenter = options?.anchorCenter;
  if (anchorCenter) {
    x_cm = anchorCenter.x_cm - width_cm / 2;
    y_cm = anchorCenter.y_cm - height_cm / 2;
  }

  const fitted = fitLayerTransform(
    x_cm,
    y_cm,
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

export function fitShapeLayer(
  layer: ShapeDesignLayer,
  printArea: PrintAreaCmBounds,
): ShapeDesignLayer {
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

export function fitDesignLayer(
  layer: DesignLayer,
  printArea: PrintAreaCmBounds,
): DesignLayer {
  if (layer.type === "text") return fitTextLayer(layer, printArea);
  if (layer.type === "shape") return fitShapeLayer(layer, printArea);
  return fitImageLayer(layer, printArea);
}

export function fitDesignLayers(
  layers: DesignLayer[],
  printArea: PrintAreaCmBounds,
): DesignLayer[] {
  return layers.map((layer) => fitDesignLayer(layer, printArea));
}

export interface LayerTransformPatch {
  x_cm?: number;
  y_cm?: number;
  scale?: number;
  rotation?: number;
}

export interface ApplyClampedLayerPatchOptions {
  gridSnap?: boolean;
  elementSnapThreshold?: number;
  otherElements?: SnapTarget[];
  rasterFit?: FitRasterImageOptions;
}

/** 套用變換並 clamp 至印刷區（拖曳／旋轉／縮放共用） */
export function applyClampedLayerPatch(
  layer: DesignLayer,
  patch: LayerTransformPatch,
  printArea: PrintAreaCmBounds,
  options?: ApplyClampedLayerPatchOptions,
): DesignLayer {
  const nextRotation = patch.rotation ?? layer.rotation;
  const positionChanged =
    patch.x_cm !== undefined || patch.y_cm !== undefined;

  if (layer.type === "text") {
    const nextScale = patch.scale ?? layer.scale;
    const draft: TextDesignLayer = {
      ...layer,
      x_cm: patch.x_cm ?? layer.x_cm,
      y_cm: patch.y_cm ?? layer.y_cm,
      scale: nextScale,
      rotation: nextRotation,
    };
    const measured = getTextLayerCmRect(draft);
    let nextX = draft.x_cm;
    let nextY = draft.y_cm;

    if (positionChanged) {
      const snap = applyDragSnap(
        nextX,
        nextY,
        measured.width_cm,
        measured.height_cm,
        1,
        printArea,
        {
          gridSnap: options?.gridSnap ?? false,
          elementSnap: true,
          elementSnapThreshold: options?.elementSnapThreshold,
          otherElements: options?.otherElements ?? [],
        },
      );
      nextX = snap.x;
      nextY = snap.y;
    }

    return fitTextLayer(
      { ...draft, x_cm: nextX, y_cm: nextY },
      printArea,
    );
  }

  const nextScale = patch.scale ?? layer.scale;
  let nextX = patch.x_cm ?? layer.x_cm;
  let nextY = patch.y_cm ?? layer.y_cm;

  if (positionChanged) {
    const snap = applyDragSnap(
      nextX,
      nextY,
      layer.width_cm,
      layer.height_cm,
      nextScale,
      printArea,
      {
        gridSnap: options?.gridSnap ?? false,
        elementSnap: true,
        elementSnapThreshold: options?.elementSnapThreshold,
        otherElements: options?.otherElements ?? [],
      },
    );
    nextX = snap.x;
    nextY = snap.y;
  }

  if (layer.type === "shape") {
    return fitShapeLayer(
      {
        ...layer,
        x_cm: nextX,
        y_cm: nextY,
        scale: nextScale,
        rotation: nextRotation,
      },
      printArea,
    );
  }

  return fitImageLayer(
    {
      ...layer,
      x_cm: nextX,
      y_cm: nextY,
      scale: nextScale,
      rotation: nextRotation,
    },
    printArea,
    options?.rasterFit,
  );
}
