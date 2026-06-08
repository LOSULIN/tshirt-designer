"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  PRINT_AREA,
  TEMPLATES,
} from "@/lib/constants";
import type { Gender, ShirtColor, Side } from "@/lib/constants";
import { DESIGN_SIDES, hasAnyDesign, hasDesignInSlot } from "@/lib/design-state";
import type { DesignLayersByTemplate } from "@/lib/types";
import { guidesEqual } from "@/lib/element-snap";
import { sortLayersByZIndex } from "@/lib/layers";
import { buildSnapTargetsFromLayers } from "@/lib/snap-targets";
import { resolveFontFamily } from "@/lib/text-layer";
import type { DesignLayer, TextDesignLayer } from "@/lib/types";
import { ClothingBrowseModal } from "./ClothingBrowseModal";
import { ClothingBrowseWidget } from "./ClothingBrowseWidget";
import { DesignReviewModal } from "./DesignReviewModal";
import { DesignToolbar } from "./DesignToolbar";
import { TemplateImage } from "./TemplateImage";
import { ElementAlignmentGuides } from "./ElementAlignmentGuides";
import {
  PrintAreaCenterGuides,
  PrintAreaGrid,
  PrintSafeZoneGuide,
} from "./PrintAreaGrid";
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

const ZOOM_STEPS = [0.75, 0.9, 1, 1.1, 1.25];
const CANVAS_ASPECT = CANVAS_WIDTH / CANVAS_HEIGHT;
/** 預覽區留白比例，避免寬螢幕下模特頭頂／底部被裁切 */
const PREVIEW_FIT_RATIO = 0.9;

export function DesignCanvas({
  gender,
  shirtColor,
  side,
  layers,
  layersByTemplate,
  selectedIds,
  showGrid,
  gridSnapEnabled,
  elementSnapDistance,
  isBusy,
  selectedText,
  primaryLocked,
  focusTextEditor,
  warnings,
  onSelectLayer,
  onLayerTransformChange,
  onLayerRotationChange,
  onClearSelection,
  onSideChange,
  onDuplicateLayer,
  onDeleteLayer,
  onMoveLayer,
  onUpload,
  onAddText,
  onTextChange,
  onClearAllDesign,
}: {
  gender: Gender;
  shirtColor: ShirtColor;
  side: Side;
  layers: DesignLayer[];
  layersByTemplate: DesignLayersByTemplate;
  selectedIds: string[];
  showGrid: boolean;
  gridSnapEnabled: boolean;
  elementSnapDistance: number;
  isBusy: boolean;
  selectedText: TextDesignLayer | null;
  primaryLocked: boolean;
  focusTextEditor: boolean;
  warnings: string[];
  onSelectLayer: (id: string, shiftKey: boolean) => void;
  onLayerTransformChange: (id: string, next: { x: number; y: number }) => void;
  onLayerRotationChange: (id: string, rotation: number) => void;
  onClearSelection: () => void;
  onSideChange: (side: Side) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayer: (id: string, action: "top" | "up" | "down" | "bottom") => void;
  onUpload: (file: File) => void;
  onAddText: () => void;
  onTextChange: (patch: Partial<TextDesignLayer>) => void;
  onClearAllDesign: () => void;
}) {
  const [snapGuides, setSnapGuides] = useState<SnapGuidesState>(EMPTY_GUIDES);
  const [zoomIndex, setZoomIndex] = useState(0); // 預設 75%
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDesignReview, setShowDesignReview] = useState(false);
  const [showClothingBrowse, setShowClothingBrowse] = useState(false);
  const hasCurrentSlotDesign = layers.length > 0;
  const hasAnyDesignContent = hasAnyDesign(layersByTemplate);
  const canReviewGenderDesign = DESIGN_SIDES.some((s) =>
    hasDesignInSlot(layersByTemplate, gender, s),
  );

  const templateSrc = TEMPLATES[gender][side];
  const visibleLayers = useMemo(
    () => sortLayersByZIndex(layers).filter((l) => l.visible),
    [layers],
  );
  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const zoom = ZOOM_STEPS[zoomIndex];

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
    left: `${(PRINT_AREA.x / CANVAS_WIDTH) * 100}%`,
    top: `${(PRINT_AREA.y / CANVAS_HEIGHT) * 100}%`,
    width: `${(PRINT_AREA.width / CANVAS_WIDTH) * 100}%`,
    height: `${(PRINT_AREA.height / CANVAS_HEIGHT) * 100}%`,
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-3 py-1.5">
          <h2 className="text-sm font-semibold text-zinc-900">預覽畫布</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              title="瀏覽完整衣服設計（正面與背面）"
              disabled={isBusy || !canReviewGenderDesign}
              onClick={() => setShowDesignReview(true)}
              className="flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden>👁</span>
              <span>設計瀏覽</span>
            </button>
            <button
              type="button"
              title="清除全部重新設計"
              disabled={isBusy || !hasAnyDesignContent}
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden>↩</span>
              <span>重新設計</span>
            </button>
          </div>
        </div>

        <div className="@container relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-zinc-100 p-2">
          <div
            data-canvas-root
            className="relative shrink-0 transition-transform duration-200"
            style={{
              aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
              width: `min(calc(100cqw * ${PREVIEW_FIT_RATIO}), calc(100cqh * ${CANVAS_ASPECT} * ${PREVIEW_FIT_RATIO}))`,
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
            onPointerDown={() => onClearSelection()}
          >
            <TemplateImage
              gender={gender}
              side={side}
              src={templateSrc}
              alt="服飾模板"
              className="absolute inset-0 h-full w-full object-contain"
            />
            <div
              data-print-area
              className="absolute overflow-hidden border-2 border-dashed border-blue-500 bg-blue-500/5"
              style={printAreaStyle}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <PrintSafeZoneGuide />
              <PrintAreaGrid visible={showGrid} />

              {visibleLayers.map((layer) => {
                const isActive = selectedIds.includes(layer.id);
                const isPrimary = layer.id === primaryId;
                const showControls =
                  isPrimary && !layer.locked && !isBusy;
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
                    showControls={showControls}
                    locked={layer.locked}
                    onSelect={(shiftKey) => onSelectLayer(layer.id, shiftKey)}
                    onTransformChange={(next) =>
                      onLayerTransformChange(layer.id, next)
                    }
                    onRotationChange={
                      showControls
                        ? (rotation) =>
                            onLayerRotationChange(layer.id, rotation)
                        : undefined
                    }
                    onDuplicate={
                      showControls
                        ? () => onDuplicateLayer(layer.id)
                        : undefined
                    }
                    onDelete={
                      showControls
                        ? () => onDeleteLayer(layer.id)
                        : undefined
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

          <ClothingBrowseWidget
            side={side}
            shirtColor={shirtColor}
            layers={layers}
            onOpen={() => setShowClothingBrowse(true)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 bg-white px-3 py-1.5">
          <div className="flex gap-1">
            {(
              [
                ["front", "正面"],
                ["back", "背面"],
              ] as const
            ).map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => onSideChange(s)}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  side === s
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
              className="rounded-md border border-zinc-200 px-2 py-0.5 text-xs hover:bg-zinc-50 disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-[2.5rem] text-center text-xs text-zinc-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              onClick={() =>
                setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
              }
              className="rounded-md border border-zinc-200 px-2 py-0.5 text-xs hover:bg-zinc-50 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <DesignToolbar
          isBusy={isBusy}
          selectedText={selectedText}
          primaryLocked={primaryLocked}
          focusTextEditor={focusTextEditor}
          warnings={warnings}
          onUpload={onUpload}
          onAddText={onAddText}
          onTextChange={onTextChange}
        />
      </div>

      <DesignReviewModal
        open={showDesignReview}
        gender={gender}
        layersByTemplate={layersByTemplate}
        onClose={() => setShowDesignReview(false)}
      />

      <ClothingBrowseModal
        open={showClothingBrowse}
        gender={gender}
        shirtColor={shirtColor}
        layersByTemplate={layersByTemplate}
        onClose={() => setShowClothingBrowse(false)}
      />

      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="clear-design-title"
          >
            <h3
              id="clear-design-title"
              className="text-base font-semibold text-zinc-900"
            >
              清除全部設計？
            </h3>
            <p className="mt-2 text-sm text-zinc-900">
              將刪除所有圖片與文字圖層，無法復原，可重新開始設計。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirm(false);
                  onClearAllDesign();
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                確認清除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
