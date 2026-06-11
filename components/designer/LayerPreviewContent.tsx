"use client";

import type { PrintAreaCmBounds } from "@/lib/design-cm";
import { getRichTextDomStyle } from "@/lib/text-style";
import type { DesignLayer } from "@/lib/types";
import { ShapeLayerContent } from "./ShapeLayerContent";

export function LayerPreviewContent({
  layer,
  printArea,
}: {
  layer: DesignLayer;
  printArea: PrintAreaCmBounds;
}) {
  if (layer.type === "image") {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={layer.image.previewUrl}
        alt={layer.name}
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
    );
  }

  if (layer.type === "shape") {
    return <ShapeLayerContent layer={layer} />;
  }

  if (!layer.text) {
    return <span className="opacity-0"> </span>;
  }

  return (
    <span
      className="block h-full w-full select-none px-1"
      style={getRichTextDomStyle(layer, printArea.height)}
    >
      {layer.text}
    </span>
  );
}
