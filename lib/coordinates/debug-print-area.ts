/**
 * Debug Print Area — 彙整 Production / Preview / Mockup 座標快照。
 */

import type { Side } from "../constants";
import type { ApparelSize } from "../sizes";
import type { DesignLayer } from "../types";
import {
  getProductionExportDimensionsPx,
  getProductionPrintAreaMm,
  getProductionSafeAreaMm,
  type ProductionRectMm,
} from "./production";
import {
  getPreviewGarmentVisualScale,
  getPreviewPrintAreaContainerPct,
  getPreviewPrintAreaContainerStyle,
  getPreviewPrintReference,
  PREVIEW_CONTAINER,
} from "./preview";
import {
  getFlatMockupPrintAreaContainerStyle,
  getFlatMockupPrintReference,
  getModelMockupPrintAreaContainerStyle,
  getModelMockupPrintReference,
  MOCKUP_FLAT_CONTAINER,
} from "./mockup";
import { UI_GLOBAL_PRINT_OFFSET_Y_PX } from "./ui-print-offset";

export interface PrintAreaDebugSnapshot {
  side: Side;
  size: ApparelSize | string;
  production: {
    printArea_mm: { width_mm: number; height_mm: number };
    safeArea_mm: ReturnType<typeof getProductionSafeAreaMm>;
    export_px: ReturnType<typeof getProductionExportDimensionsPx>;
  };
  preview: {
    container: typeof PREVIEW_CONTAINER;
    reference: ReturnType<typeof getPreviewPrintReference>;
    printAreaStyle: ReturnType<typeof getPreviewPrintAreaContainerStyle>;
    printAreaPct: ReturnType<typeof getPreviewPrintAreaContainerPct>;
    garmentVisualScale: number;
  };
  mockup: {
    flatContainer: typeof MOCKUP_FLAT_CONTAINER;
    flatReference: ReturnType<typeof getFlatMockupPrintReference>;
    modelReference: ReturnType<typeof getModelMockupPrintReference>;
    uiGlobalOffsetPx: number;
    flatPrintAreaStyle: ReturnType<typeof getFlatMockupPrintAreaContainerStyle>;
    modelPrintAreaStyle: ReturnType<typeof getModelMockupPrintAreaContainerStyle>;
  };
  selectedLayer_mm?: ProductionRectMm | null;
}

export function buildPrintAreaDebugSnapshot(params: {
  side: Side;
  size: ApparelSize | string;
  selectedLayer?: DesignLayer | null;
  readLayerProductionRectMm?: (layer: DesignLayer) => ProductionRectMm;
}): PrintAreaDebugSnapshot {
  const { side, size, selectedLayer, readLayerProductionRectMm } = params;
  const printAreaMm = getProductionPrintAreaMm();

  return {
    side,
    size,
    production: {
      printArea_mm: printAreaMm,
      safeArea_mm: getProductionSafeAreaMm(printAreaMm),
      export_px: getProductionExportDimensionsPx(),
    },
    preview: {
      container: PREVIEW_CONTAINER,
      reference: getPreviewPrintReference(side),
      printAreaStyle: getPreviewPrintAreaContainerStyle(side),
      printAreaPct: getPreviewPrintAreaContainerPct(printAreaMm),
      garmentVisualScale: getPreviewGarmentVisualScale(size),
    },
    mockup: {
      flatContainer: MOCKUP_FLAT_CONTAINER,
      flatReference: getFlatMockupPrintReference(side),
      modelReference: getModelMockupPrintReference(side),
      uiGlobalOffsetPx: UI_GLOBAL_PRINT_OFFSET_Y_PX,
      flatPrintAreaStyle: getFlatMockupPrintAreaContainerStyle(side),
      modelPrintAreaStyle: getModelMockupPrintAreaContainerStyle(side),
    },
    selectedLayer_mm:
      selectedLayer && readLayerProductionRectMm
        ? readLayerProductionRectMm(selectedLayer)
        : null,
  };
}

export function logPrintAreaDebug(snapshot: PrintAreaDebugSnapshot): void {
  const p = snapshot.production;
  const v = snapshot.preview;
  const m = snapshot.mockup;

  console.debug("[Print Area Debug] ─────────────────────────");
  console.debug(
    `[Production] ${p.printArea_mm.width_mm}×${p.printArea_mm.height_mm} mm · export ${p.export_px.widthPx}×${p.export_px.heightPx} px`,
  );
  console.debug(
    `[Production Safe] ${p.safeArea_mm.width_mm}×${p.safeArea_mm.height_mm} mm (inset ${p.safeArea_mm.x_mm} mm)`,
  );
  console.debug(
    `[Preview] ref (${v.reference.x}, ${v.reference.y}) · shirt scale ${v.garmentVisualScale} · overlay ${v.printAreaStyle.width}×${v.printAreaStyle.height}`,
  );
  console.debug(
    `[Mockup flat] ref (${m.flatReference.x}, ${m.flatReference.y})`,
  );
  console.debug(
    `[Mockup model] ref (${m.modelReference.x}, ${m.modelReference.y})`,
  );
  if (snapshot.selectedLayer_mm) {
    const l = snapshot.selectedLayer_mm;
    console.debug(
      `[Selected layer] x=${l.x_mm} y=${l.y_mm} w=${l.width_mm} h=${l.height_mm} mm`,
    );
  }
  console.debug("[Print Area Debug] snapshot:", snapshot);
}
