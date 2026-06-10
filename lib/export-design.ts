import { type Gender, type Side } from "./constants";
import {
  DESIGN_GENDERS,
  DESIGN_SIDES,
  getLayersForSlot,
} from "./design-state";
import { renderPrintExportPng } from "./print-export-system";
import { getExportMeta } from "./print-area";
import { serializeTextLayer } from "./text-layer";
import type {
  DesignConfig,
  DesignLayer,
  DesignLayersByTemplate,
  TextDesignLayer,
  UploadedDesignImage,
} from "./types";

/** @deprecated 請用 renderPrintExportPng */
export async function renderCompletedDesignPng(
  templateType: DesignConfig["templateType"],
  side: DesignConfig["side"],
  layers: DesignLayer[],
): Promise<Blob> {
  void templateType;
  void side;
  return renderPrintExportPng(layers);
}

export { renderPrintExportPng } from "./print-export-system";
export {
  exportDesignBundle,
  exportAndDownloadDesignBundle,
  hasExportableDesign,
} from "./design-export-system";
export { renderMockupPreviewPng } from "./mockup-export";
export { renderProofSheetPdf } from "./proof-sheet-export";

/** 向後相容 */
export async function renderCompletedDesignPngLegacy(
  config: DesignConfig,
  designImage: UploadedDesignImage | null,
  textLayers: TextDesignLayer[],
): Promise<Blob> {
  const layers: DesignLayer[] = [];
  if (designImage) {
    layers.push({
      id: "legacy-image",
      name: "圖片",
      type: "image",
      visible: true,
      locked: false,
      zIndex: 0,
      x_cm: config.x_cm,
      y_cm: config.y_cm,
      width_cm: config.width_cm,
      height_cm: config.height_cm,
      scale: config.scale,
      rotation: config.rotation,
      image: designImage,
    });
  }
  textLayers.forEach((t, i) => {
    layers.push({
      ...t,
      name: `Text ${i + 1}`,
      visible: true,
      locked: false,
      zIndex: layers.length + i,
    });
  });
  return renderPrintExportPng(layers);
}

function serializeLayerForJson(layer: DesignLayer) {
  const base = {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    visible: layer.visible,
    locked: layer.locked,
    zIndex: layer.zIndex,
    x_cm: layer.x_cm,
    y_cm: layer.y_cm,
    width_cm: layer.width_cm,
    height_cm: layer.height_cm,
    scale: layer.scale,
    rotation: layer.rotation,
  };
  if (layer.type === "image") {
    return {
      ...base,
      fileName: layer.image.fileName,
      mimeType: layer.image.mimeType,
    };
  }
  return {
    ...base,
    text: layer.text,
    fontSize_cm: layer.fontSize_cm,
    fontFamily: layer.fontFamily,
    color: layer.color,
    opacity: layer.opacity,
    fontWeight: layer.fontWeight,
  };
}

function serializeLayersByTemplate(layersByTemplate: DesignLayersByTemplate) {
  const result: Record<string, Record<string, ReturnType<typeof serializeLayerForJson>[]>> =
    {};
  for (const gender of DESIGN_GENDERS) {
    result[gender] = {};
    for (const side of DESIGN_SIDES) {
      result[gender][side] = getLayersForSlot(layersByTemplate, gender, side).map(
        serializeLayerForJson,
      );
    }
  }
  return result;
}

export function buildDesignJson(
  templateType: DesignConfig["templateType"],
  side: DesignConfig["side"],
  layers: DesignLayer[],
  meta?: Record<string, unknown>,
): string {
  const firstImage = layers.find((l) => l.type === "image");

  return JSON.stringify(
    {
      templateType,
      side,
      export: getExportMeta(side),
      ...meta,
      layers: layers.map(serializeLayerForJson),
      x_cm: firstImage?.x_cm ?? 0,
      y_cm: firstImage?.y_cm ?? 0,
      width_cm: firstImage?.width_cm ?? 0,
      height_cm: firstImage?.height_cm ?? 0,
      scale: firstImage?.scale ?? 1,
      rotation: firstImage?.rotation ?? 0,
    },
    null,
    2,
  );
}

/** 儲存／送出：包含所有模板與正反面圖層（v2） */
export function buildFullDesignJson(
  layersByTemplate: DesignLayersByTemplate,
  activeGender: Gender,
  activeSide: Side,
  meta?: Record<string, unknown>,
): string {
  const activeLayers = getLayersForSlot(layersByTemplate, activeGender, activeSide);
  const firstImage = activeLayers.find((l) => l.type === "image");

  const exportBySide = {
    front: getExportMeta("front"),
    back: getExportMeta("back"),
  };

  return JSON.stringify(
    {
      version: 2,
      templateType: activeGender,
      side: activeSide,
      activeGender,
      activeSide,
      export: getExportMeta(activeSide),
      exportBySide,
      ...meta,
      layersByTemplate: serializeLayersByTemplate(layersByTemplate),
      x_cm: firstImage?.x_cm ?? 0,
      y_cm: firstImage?.y_cm ?? 0,
      width_cm: firstImage?.width_cm ?? 0,
      height_cm: firstImage?.height_cm ?? 0,
      scale: firstImage?.scale ?? 1,
      rotation: firstImage?.rotation ?? 0,
    },
    null,
    2,
  );
}

function serializeTextDesignLayer(
  layer: TextDesignLayer,
  gender: Gender,
  side: Side,
) {
  return {
    ...serializeTextLayer({
      ...layer,
      type: "text",
    }),
    templateType: gender,
    side,
    layerId: layer.id,
    layerName: layer.name,
  };
}

export function buildAllTextsJson(layersByTemplate: DesignLayersByTemplate): string {
  const texts: ReturnType<typeof serializeTextDesignLayer>[] = [];

  for (const gender of DESIGN_GENDERS) {
    for (const side of DESIGN_SIDES) {
      for (const layer of getLayersForSlot(layersByTemplate, gender, side)) {
        if (layer.type === "text") {
          texts.push(serializeTextDesignLayer(layer, gender, side));
        }
      }
    }
  }

  return JSON.stringify({ texts }, null, 2);
}
