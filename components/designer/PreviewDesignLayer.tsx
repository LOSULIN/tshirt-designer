"use client";

import { getLayerOverflowStateForSize } from "@/lib/layer-overflow";
import {
  createPreviewRuntimeContext,
  getPreviewPhysicalReferencePrintArea,
  previewGarmentRectToPhysicalStyle,
} from "@/lib/preview-runtime";
import type { Side } from "@/lib/constants";
import type { DesignLayer } from "@/lib/types";
import { LayerPreviewContent } from "./LayerPreviewContent";

/** Preview Runtime layer — physical cm render with overflow indication. */
export function PreviewDesignLayer({
  layer,
  side,
  size,
}: {
  layer: DesignLayer;
  side: Side;
  size: string;
}) {
  const ctx = createPreviewRuntimeContext(side, size);
  const overflow = getLayerOverflowStateForSize(layer, size, side);
  const physicalRefPrintArea = getPreviewPhysicalReferencePrintArea(side);

  return (
    <div
      className={`pointer-events-none absolute ${
        overflow.exceedsPrintArea
          ? "ring-2 ring-red-500 ring-offset-1"
          : ""
      }`}
      style={previewGarmentRectToPhysicalStyle(layer, ctx)}
    >
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          transform: `rotate(${layer.rotation}deg)`,
          transformOrigin: "center center",
        }}
      >
        <LayerPreviewContent layer={layer} printArea={physicalRefPrintArea} />
      </div>
    </div>
  );
}
