"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import {
  IMAGE_HEIGHT,
  IMAGE_WIDTH,
  PRINT_AREA,
  TEMPLATES,
} from "@/lib/constants";
import type { Gender, Side } from "@/lib/constants";
import { guidesEqual } from "@/lib/element-snap";
import { sortLayersByZIndex } from "@/lib/layers";
import { buildSnapTargetsFromLayers } from "@/lib/snap-targets";
import { resolveFontFamily } from "@/lib/text-layer";
import type { DesignLayer } from "@/lib/types";
import { ElementAlignmentGuides } from "./ElementAlignmentGuides";
import { PrintAreaCenterGuides, PrintAreaGrid } from "./PrintAreaGrid";
import {
  PrintAreaElement,
  type SnapGuidesState,
} from "./PrintAreaElement";

const EMPTY_GUIDES: SnapGuidesState = {
  printCenterX: false,
  printCenterY: false,
  elementVertical: [],
  elementHorizontal: [],
};

export function DesignCanvas({
  gender,
  side,
  layers,
  selectedIds,
  showGrid,
  gridSnapEnabled,
  elementSnapDistance,
  onSelectLayer,
  onLayerTransformChange,
  onClearSelection,
}: {
  gender: Gender;
  side: Side;
  layers: DesignLayer[];
  selectedIds: string[];
  showGrid: boolean;
  gridSnapEnabled: boolean;
  elementSnapDistance: number;
  onSelectLayer: (id: string, shiftKey: boolean) => void;
  onLayerTransformChange: (id: string, next: { x: number; y: number }) => void;
  onClearSelection: () => void;
}) {
  const [snapGuides, setSnapGuides] = useState<SnapGuidesState>(EMPTY_GUIDES);

  const templateSrc = TEMPLATES[gender][side];
  const visibleLayers = useMemo(
    () => sortLayersByZIndex(layers).filter((l) => l.visible),
    [layers],
  );

  const handleSnapGuides = useCallback((guides: SnapGuidesState) => {
    setSnapGuides((prev) => {
      if (
        prev.printCenterX === guides.printCenterX &&
        prev.printCenterY === guides.printCenterY &&
        guidesEqual(prev.elementVertical, guides.elementVertical) &&
        guidesEqual(prev.elementHorizontal, guides.elementHorizontal)
      ) {
        return prev;
      }
      return guides;
    });
  }, []);

  const printAreaStyle = {
    left: `${(PRINT_AREA.x / IMAGE_WIDTH) * 100}%`,
    top: `${(PRINT_AREA.y / IMAGE_HEIGHT) * 100}%`,
    width: `${(PRINT_AREA.width / IMAGE_WIDTH) * 100}%`,
    height: `${(PRINT_AREA.height / IMAGE_HEIGHT) * 100}%`,
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-auto bg-zinc-100 p-4">
      <div
        data-canvas-root
        className="relative w-full max-w-[520px]"
        style={{ aspectRatio: `${IMAGE_WIDTH} / ${IMAGE_HEIGHT}` }}
        onPointerDown={() => onClearSelection()}
      >
        <Image
          src={templateSrc}
          alt="服飾模板"
          fill
          className="object-contain"
          sizes="520px"
          priority
        />

        <div
          data-print-area
          className="absolute overflow-hidden border-2 border-dashed border-red-500"
          style={printAreaStyle}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <PrintAreaGrid visible={showGrid} />

          {visibleLayers.map((layer) => {
            const isActive = selectedIds.includes(layer.id);
            const scale = layer.type === "image" ? layer.scale : 1;

            return (
              <PrintAreaElement
                key={layer.id}
                gridSnapEnabled={gridSnapEnabled}
                elementSnapEnabled
                elementSnapDistance={elementSnapDistance}
                otherElements={buildSnapTargetsFromLayers(layer.id, layers)}
                x={layer.x}
                y={layer.y}
                width={layer.width}
                height={layer.height}
                scale={scale}
                rotation={layer.rotation}
                isActive={isActive}
                locked={layer.locked}
                onSelect={(shiftKey) => onSelectLayer(layer.id, shiftKey)}
                onTransformChange={(next) =>
                  onLayerTransformChange(layer.id, next)
                }
                onSnapGuidesChange={handleSnapGuides}
              >
                {layer.type === "image" ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={layer.image.previewUrl}
                    alt={layer.name}
                    draggable={false}
                    className="h-full w-full select-none object-contain"
                  />
                ) : (
                  <span
                    className="whitespace-pre px-1 text-center leading-none select-none"
                    style={{
                      fontFamily: resolveFontFamily(layer.fontFamily),
                      fontSize: `${layer.fontSize * layer.scale}px`,
                      fontWeight: layer.fontWeight,
                      color: layer.color,
                      opacity: layer.opacity,
                    }}
                  >
                    {layer.text || " "}
                  </span>
                )}
              </PrintAreaElement>
            );
          })}

          <ElementAlignmentGuides
            vertical={snapGuides.elementVertical}
            horizontal={snapGuides.elementHorizontal}
          />
          <PrintAreaCenterGuides
            highlightX={snapGuides.printCenterX}
            highlightY={snapGuides.printCenterY}
          />
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-zinc-500">
        紅色虛線為印刷區域 · Shift+點擊多選圖層
      </p>
    </div>
  );
}
