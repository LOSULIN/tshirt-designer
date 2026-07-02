import type { LayerCmRect, PrintAreaCmBounds } from "./design-cm";
import { getLayerEffectiveCmRect } from "./design-cm";
import type { SnapTarget } from "./element-snap";
import type { FitRasterImageOptions } from "./image-print-quality";
import { applyDragSnap, fitLayerTransform } from "./geometry";
import { getTextLayerMeasuredCmRect, getTextLayerPlacementCmRect, measureTextBoundsCm } from "./text-layer";
import type {
  DesignLayer,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "./types";

export function fitImageLayer(
  layer: ImageDesignLayer,
  printArea: PrintAreaCmBounds,
  _options?: FitRasterImageOptions,
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

export interface ResizeImageLayerOptions {
  keepRatio: boolean;
  anchorCenter: Pick<LayerCmRect, "x_cm" | "y_cm">;
}

/** Inspector / Object Card 手動改尺寸（不依 artwork 比例） */
export function resizeImageLayer(
  layer: ImageDesignLayer,
  next: LayerCmRect,
  options: ResizeImageLayerOptions,
): ImageDesignLayer {
  const { anchorCenter, keepRatio } = options;

  if (!keepRatio) {
    return {
      ...layer,
      keepRatio: false,
      width_cm: next.width_cm,
      height_cm: next.height_cm,
      scale: 1,
      x_cm: anchorCenter.x_cm - next.width_cm / 2,
      y_cm: anchorCenter.y_cm - next.height_cm / 2,
    };
  }

  const effectiveWidth = layer.width_cm * layer.scale;
  const effectiveHeight = layer.height_cm * layer.scale;
  const widthDelta = Math.abs(next.width_cm - effectiveWidth);
  const heightDelta = Math.abs(next.height_cm - effectiveHeight);
  const factor =
    heightDelta > widthDelta && effectiveHeight > 0
      ? next.height_cm / effectiveHeight
      : effectiveWidth > 0
        ? next.width_cm / effectiveWidth
        : 1;

  if (Math.abs(factor - 1) < 1e-6) {
    return { ...layer, keepRatio: true };
  }

  const nextScale = layer.scale * factor;
  return {
    ...layer,
    keepRatio: true,
    scale: nextScale,
    x_cm: anchorCenter.x_cm - (layer.width_cm * nextScale) / 2,
    y_cm: anchorCenter.y_cm - (layer.height_cm * nextScale) / 2,
  };
}

const TOOLBAR_SCALE_MIN_CM = 0.2;

/** 浮動工具列 +/-：更新 layer 印刷尺寸（非僅 visual scale） */
export function scaleLayerFromToolbar(
  layer: DesignLayer,
  factor: number,
  printArea: PrintAreaCmBounds,
  options?: { rasterFit?: FitRasterImageOptions },
): DesignLayer {
  if (Math.abs(factor - 1) < 1e-6) return layer;

  const current =
    layer.type === "text"
      ? getTextLayerPlacementCmRect(layer)
      : getLayerEffectiveCmRect(layer);
  const anchorCenter = {
    x_cm: current.x_cm + current.width_cm / 2,
    y_cm: current.y_cm + current.height_cm / 2,
  };
  const width_cm = Math.max(TOOLBAR_SCALE_MIN_CM, current.width_cm * factor);
  const height_cm = Math.max(TOOLBAR_SCALE_MIN_CM, current.height_cm * factor);
  const nextRect: LayerCmRect = {
    x_cm: anchorCenter.x_cm - width_cm / 2,
    y_cm: anchorCenter.y_cm - height_cm / 2,
    width_cm,
    height_cm,
  };

  if (layer.type === "text") {
    return resizeTextLayer(
      layer,
      nextRect,
      { keepRatio: layer.keepRatio ?? true, anchorCenter },
      printArea,
    );
  }

  if (layer.type === "image") {
    const keepRatio = layer.keepRatio ?? true;
    const resized = resizeImageLayer(layer, nextRect, {
      keepRatio,
      anchorCenter,
    });
    return fitImageLayer(resized, printArea, options?.rasterFit);
  }

  return fitShapeLayer(
    {
      ...layer,
      width_cm,
      height_cm,
      scale: 1,
      x_cm: nextRect.x_cm,
      y_cm: nextRect.y_cm,
    },
    printArea,
  );
}

export interface FitTextLayerOptions {
  /** Resize 期間固定不動的中心（與 PrintAreaElement 起點 effective rect 一致） */
  anchorCenter?: Pick<LayerCmRect, "x_cm" | "y_cm">;
}

export interface ResizeTextLayerOptions {
  keepRatio: boolean;
  anchorCenter: Pick<LayerCmRect, "x_cm" | "y_cm">;
}

export function resizeTextLayer(
  layer: TextDesignLayer,
  next: LayerCmRect,
  options: ResizeTextLayerOptions,
  printArea: PrintAreaCmBounds,
): TextDesignLayer {
  const { keepRatio, anchorCenter } = options;
  const current = getTextLayerPlacementCmRect(layer);

  if (!keepRatio) {
    const fitted = fitLayerTransform(
      anchorCenter.x_cm - next.width_cm / 2,
      anchorCenter.y_cm - next.height_cm / 2,
      next.width_cm,
      next.height_cm,
      1,
      layer.rotation,
      printArea,
    );
    return {
      ...layer,
      keepRatio: false,
      width_cm: next.width_cm,
      height_cm: next.height_cm,
      x_cm: fitted.x,
      y_cm: fitted.y,
    };
  }

  const widthDelta = Math.abs(next.width_cm - current.width_cm);
  const heightDelta = Math.abs(next.height_cm - current.height_cm);
  const factor =
    heightDelta > widthDelta && current.height_cm > 0
      ? next.height_cm / current.height_cm
      : current.width_cm > 0
        ? next.width_cm / current.width_cm
        : 1;

  if (Math.abs(factor - 1) < 1e-6) {
    return { ...layer, keepRatio: true };
  }

  return fitTextLayer(
    { ...layer, scale: layer.scale * factor, keepRatio: true },
    printArea,
    { anchorCenter },
  );
}

export function fitTextLayer(
  layer: TextDesignLayer,
  printArea: PrintAreaCmBounds,
  options?: FitTextLayerOptions,
): TextDesignLayer {
  if (layer.keepRatio === false) {
    const fitted = fitLayerTransform(
      layer.x_cm,
      layer.y_cm,
      layer.width_cm,
      layer.height_cm,
      1,
      layer.rotation,
      printArea,
    );
    return { ...layer, x_cm: fitted.x, y_cm: fitted.y };
  }

  const fontSize_cm = layer.fontSize_cm * layer.scale;
  const { width_cm, height_cm } = measureTextBoundsCm(
    layer.text,
    fontSize_cm,
    layer.fontFamily,
    layer.fontWeight,
    layer,
  );

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
  const scaleOnly =
    patch.scale !== undefined &&
    patch.x_cm === undefined &&
    patch.y_cm === undefined &&
    patch.rotation === undefined;

  if (
    scaleOnly &&
    patch.scale !== undefined &&
    Math.abs(patch.scale - layer.scale) > 1e-6
  ) {
    return scaleLayerFromToolbar(
      layer,
      patch.scale / layer.scale,
      printArea,
      options,
    );
  }

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
    const measured = getTextLayerPlacementCmRect(draft);
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
