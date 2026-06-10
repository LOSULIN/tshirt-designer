/**
 * Live Inspector System — 唯一設計狀態來源。
 * 由 layers + 成衣尺碼衍生；拖曳／縮放／新增圖層時自動重算。
 */

import { inspectDesignLayer, type LayerInspectorReport } from "./design-inspector";
import { getPrintAreaCmBounds } from "./design-cm";
import { sortLayersForPanel } from "./layers";
import { PRINT_AREA } from "./printArea";
import {
  getSizeMeasurement,
  toApparelSize,
  type ApparelSize,
} from "./sizes";
import type { DesignLayer } from "./types";

export interface DesignStateGarment {
  size: ApparelSize;
  chestWidth: number;
  length: number;
  printArea: {
    width_cm: number;
    height_cm: number;
  };
}

export interface DesignStateElement {
  id: string;
  type: "text" | "image";
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
  content: string;
}

export interface LiveDesignStateElement extends DesignStateElement {
  index: number;
  name: string;
  zIndex: number;
  isSelected: boolean;
  exceedsPrintArea: boolean;
  exceedsSafeZone: boolean;
  status: LayerInspectorReport["status"];
  warnings: string[];
}

export function getElementStatusLabel(element: LiveDesignStateElement): string {
  if (element.exceedsPrintArea) {
    return "OUT OF BOUNDS";
  }
  if (element.status === "warning") {
    return "WARNING";
  }
  return "OK";
}

export interface LiveDesignState {
  garment: DesignStateGarment;
  elements: LiveDesignStateElement[];
  reportsById: Record<string, LayerInspectorReport>;
}

export function getElementContent(layer: DesignLayer): string {
  if (layer.type === "text") {
    return layer.text;
  }
  return layer.image.fileName || layer.name;
}

export function layerToDesignStateElement(
  layer: DesignLayer,
  report: LayerInspectorReport,
  index: number,
  selectedLayerId: string | null = null,
): LiveDesignStateElement {
  return {
    id: layer.id,
    index,
    name: layer.name,
    type: layer.type,
    x_cm: report.x_cm,
    y_cm: report.y_cm,
    width_cm: report.width_cm,
    height_cm: report.height_cm,
    content: getElementContent(layer),
    zIndex: layer.zIndex,
    isSelected: layer.id === selectedLayerId,
    exceedsPrintArea: report.exceedsPrintArea,
    exceedsSafeZone: report.exceedsSafeZone,
    status: report.status,
    warnings: report.warnings,
  };
}

export function buildDesignStateGarment(size: ApparelSize): DesignStateGarment {
  const { chestCm, lengthCm } = getSizeMeasurement(size);
  return {
    size,
    chestWidth: chestCm,
    length: lengthCm,
    printArea: {
      width_cm: PRINT_AREA.widthCm,
      height_cm: PRINT_AREA.heightCm,
    },
  };
}

export function buildLiveDesignState(
  layers: DesignLayer[],
  sizeInput: string,
  selectedLayerId: string | null = null,
): LiveDesignState {
  const size = toApparelSize(sizeInput);
  const printArea = getPrintAreaCmBounds();
  const garment = buildDesignStateGarment(size);

  const reportsById: Record<string, LayerInspectorReport> = {};
  const sortedLayers = sortLayersForPanel(layers);
  const elements: LiveDesignStateElement[] = sortedLayers.map((layer, idx) => {
    const report = inspectDesignLayer(layer, printArea);
    reportsById[layer.id] = report;
    return layerToDesignStateElement(layer, report, idx + 1, selectedLayerId);
  });

  return { garment, elements, reportsById };
}

export function getLiveElementReport(
  state: LiveDesignState,
  layerId: string,
): LayerInspectorReport | null {
  return state.reportsById[layerId] ?? null;
}
