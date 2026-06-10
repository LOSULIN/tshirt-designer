"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CanvasInlineTextEditor } from "./CanvasInlineTextEditor";
import { LayerFloatingControls } from "./LayerFloatingControls";
import { getAdultTshirtTemplateSrc } from "@/lib/constants";
import { getLayerEffectiveCmRect } from "@/lib/design-cm";
import { getPrintAreaCmBounds } from "@/lib/design-cm";
import {
  getFixedPrintAreaContainerPct,
  getPrintAreaContainerStyle,
  PRINT_AREA,
} from "@/lib/printArea";
import { ShirtContainerFrame } from "./ShirtContainerFrame";
import { ShirtVisualScale } from "./ShirtVisualScale";
import type { Gender, ShirtColor, Side, Size } from "@/lib/constants";
import { DESIGN_SIDES, hasAnyDesign, hasDesignInSlot } from "@/lib/design-state";
import type { DesignLayersByTemplate } from "@/lib/types";
import { guidesEqual } from "@/lib/element-snap";
import { getLayersForCanvasRender } from "@/lib/layer-system";
import { buildSnapTargetsFromLayers } from "@/lib/snap-targets";
import { resolveFontFamily } from "@/lib/text-layer";
import type { DesignLayer, TextDesignLayer } from "@/lib/types";
import { CanvasInfoPanel } from "./CanvasInfoPanel";
import { ClothingBrowseModal } from "./ClothingBrowseModal";
import { ClothingBrowsePanel } from "./ClothingBrowsePanel";
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
/** 預覽區留白比例，避免寬螢幕下模特頭頂／底部被裁切 */
const PREVIEW_FIT_RATIO = 0.9;

export function DesignCanvas({
  gender,
  shirtColor,
  size,
  side,
  layers,
  layersByTemplate,
  selectedIds,
  showGrid,
  gridSnapEnabled,
  elementSnapDistance,
  isBusy,
  readOnly = false,
  focusTextEditor,
  pendingTextEditLayerId,
  onPendingTextEditConsumed,
  warnings,
  onSelectLayer,
  onLayerTransformChange,
  onLayerRotationChange,
  onLayerResize,
  onClearSelection,
  onFocusTextEditorConsumed,
  onSideChange,
  onDuplicateLayer,
  onDeleteLayer,
  onMoveLayer,
  onUpload,
  onAddText,
  onTextChange,
  onClearCurrentSlotDesign,
  onClearAllDesign,
  onTextPatch,
  onImageTransform,
  onImageResize,
  onRotationChange,
}: {
  gender: Gender;
  shirtColor: ShirtColor;
  size: Size;
  side: Side;
  layers: DesignLayer[];
  layersByTemplate: DesignLayersByTemplate;
  selectedIds: string[];
  showGrid: boolean;
  gridSnapEnabled: boolean;
  elementSnapDistance: number;
  isBusy: boolean;
  readOnly?: boolean;
  focusTextEditor: boolean;
  pendingTextEditLayerId?: string | null;
  onPendingTextEditConsumed?: () => void;
  warnings: string[];
  onSelectLayer: (id: string, shiftKey: boolean) => void;
  onLayerTransformChange: (
    id: string,
    next: { x_cm: number; y_cm: number; scale?: number },
  ) => void;
  onLayerRotationChange: (id: string, rotation: number) => void;
  onLayerResize: (
    id: string,
    next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
  ) => void;
  onClearSelection: () => void;
  onFocusTextEditorConsumed: () => void;
  onSideChange: (side: Side) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayer: (id: string, action: "top" | "up" | "down" | "bottom") => void;
  onUpload: (file: File) => void;
  onAddText: () => void;
  onTextChange: (patch: Partial<TextDesignLayer>) => void;
  onClearCurrentSlotDesign: () => void;
  onClearAllDesign: () => void;
  onTextPatch: (
    id: string,
    patch: {
      text?: string;
      fontSize_cm?: number;
      x_cm?: number;
      y_cm?: number;
      rotation?: number;
    },
  ) => void;
  onImageTransform: (
    id: string,
    patch: { x_cm?: number; y_cm?: number; scale?: number; rotation?: number },
  ) => void;
  onImageResize: (
    id: string,
    next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
  ) => void;
  onRotationChange: (id: string, rotation: number) => void;
}) {
  const [snapGuides, setSnapGuides] = useState<SnapGuidesState>(EMPTY_GUIDES);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(0); // 預設 75%
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDesignReview, setShowDesignReview] = useState(false);
  const [showClothingBrowse, setShowClothingBrowse] = useState(false);
  const hasCurrentSlotDesign = layers.length > 0;
  const hasAnyDesignContent = hasAnyDesign(layersByTemplate);
  const sideLabel = side === "front" ? "正面" : "背面";
  const canReviewGenderDesign = DESIGN_SIDES.some((s) =>
    hasDesignInSlot(layersByTemplate, gender, s),
  );

  const templateSrc = getAdultTshirtTemplateSrc(shirtColor, side);
  const printArea = useMemo(() => getPrintAreaCmBounds(), []);
  const printAreaStyle = useMemo(
    () => getPrintAreaContainerStyle(side),
    [side],
  );
  const { widthPct, heightPct } = getFixedPrintAreaContainerPct();
  const visibleLayers = useMemo(
    () => getLayersForCanvasRender(layers).filter((l) => l.visible),
    [layers],
  );
  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const primaryLayer = layers.find((layer) => layer.id === primaryId) ?? null;
  const interactionLocked = isBusy || readOnly;

  const showPrimaryActions =
    primaryLayer != null &&
    !primaryLayer.locked &&
    !interactionLocked &&
    editingTextId !== primaryLayer.id;
  const primaryActionRect = useMemo(() => {
    if (!primaryLayer) return null;
    return getLayerEffectiveCmRect(primaryLayer);
  }, [primaryLayer]);
  const zoom = ZOOM_STEPS[zoomIndex];

  useEffect(() => {
    if (!focusTextEditor || !primaryId || readOnly) return;
    const layer = layers.find((l) => l.id === primaryId && l.type === "text");
    if (layer) setEditingTextId(primaryId);
    onFocusTextEditorConsumed();
  }, [focusTextEditor, primaryId, layers, onFocusTextEditorConsumed, readOnly]);

  useEffect(() => {
    if (!pendingTextEditLayerId || readOnly) return;
    const layer = layers.find(
      (l) => l.id === pendingTextEditLayerId && l.type === "text",
    );
    if (layer) {
      setEditingTextId(pendingTextEditLayerId);
      onSelectLayer(pendingTextEditLayerId, false);
    }
    onPendingTextEditConsumed?.();
  }, [
    pendingTextEditLayerId,
    layers,
    readOnly,
    onSelectLayer,
    onPendingTextEditConsumed,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (editingTextId) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.length > 0 &&
        !interactionLocked
      ) {
        e.preventDefault();
        for (const id of [...selectedIds].reverse()) {
          const layer = layers.find((l) => l.id === id);
          if (layer && !layer.locked) onDeleteLayer(id);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingTextId, selectedIds, layers, interactionLocked, onDeleteLayer]);

  const finishTextEdit = useCallback(() => {
    setEditingTextId(null);
  }, []);

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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-3 py-1.5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">預覽畫布</h2>
            <p className="text-[10px] text-zinc-500">{size}</p>
          </div>
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
              title="清除目前模特與面向的設計"
              disabled={isBusy || readOnly || !hasCurrentSlotDesign}
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1 rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden>↩</span>
              <span>重新設計</span>
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 overflow-hidden bg-zinc-100">
          <CanvasInfoPanel
            size={size}
            layers={layers}
            selectedLayerId={primaryId}
            isBusy={isBusy}
            readOnly={readOnly}
            onSelectLayer={(id) => onSelectLayer(id, false)}
            onMoveLayer={(id, direction) => onMoveLayer(id, direction)}
            onTextPatch={onTextPatch}
            onImageTransform={onImageTransform}
            onImageResize={onImageResize}
            onRotationChange={onRotationChange}
          />

          <div className="@container relative flex min-h-0 min-w-0 flex-1 items-center justify-center p-2">
            <ShirtContainerFrame
              canvasRoot
              fitRatio={PREVIEW_FIT_RATIO}
              zoom={zoom}
              className="transition-transform duration-200"
              onPointerDown={() => onClearSelection()}
            >
              <ShirtVisualScale size={size}>
                <TemplateImage
                  gender={gender}
                  side={side}
                  src={templateSrc}
                  alt="服飾模板"
                  className="absolute inset-0 z-0 h-full w-full object-contain"
                />
              </ShirtVisualScale>
              <div
                data-print-area
                className="absolute z-10 overflow-hidden border-2 border-dashed border-blue-500 bg-blue-500/5 [container-type:size]"
                style={printAreaStyle}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const target = e.target as HTMLElement;
                  if (
                    target.closest("[data-layer-root]") ||
                    target.closest("[data-layer-actions]")
                  ) {
                    return;
                  }
                  onClearSelection();
                }}
              >
              <PrintSafeZoneGuide />
              <PrintAreaGrid visible={showGrid} printArea={printArea} />

              {visibleLayers.map((layer) => {
                const isActive = selectedIds.includes(layer.id);
                const isPrimary = layer.id === primaryId;
                const isEditing = editingTextId === layer.id;
                const showControls =
                  isPrimary &&
                  !layer.locked &&
                  !interactionLocked &&
                  !isEditing;
                const rect = getLayerEffectiveCmRect(layer);
                const scale = layer.type === "image" ? layer.scale : 1;

                return (
                  <PrintAreaElement
                    key={layer.id}
                    printArea={printArea}
                    gridSnapEnabled={gridSnapEnabled}
                    elementSnapEnabled
                    elementSnapDistance={elementSnapDistance}
                    otherElements={buildSnapTargetsFromLayers(layer.id, layers)}
                    x={rect.x_cm}
                    y={rect.y_cm}
                    width={rect.width_cm / scale}
                    height={rect.height_cm / scale}
                    scale={scale}
                    rotation={layer.rotation}
                    isActive={isActive}
                    showControls={showControls}
                    locked={layer.locked || readOnly}
                    isEditing={isEditing}
                    onSelect={(shiftKey) => onSelectLayer(layer.id, shiftKey)}
                    onTransformChange={(next) =>
                      onLayerTransformChange(layer.id, {
                        x_cm: next.x,
                        y_cm: next.y,
                        scale: next.scale,
                      })
                    }
                    onResizeChange={
                      showControls
                        ? (next) =>
                            onLayerResize(layer.id, {
                              x_cm: next.x,
                              y_cm: next.y,
                              width_cm: next.width,
                              height_cm: next.height,
                            })
                        : undefined
                    }
                    onDoubleClick={() => {
                      if (
                        layer.type === "text" &&
                        !layer.locked &&
                        !interactionLocked
                      ) {
                        setEditingTextId(layer.id);
                        onSelectLayer(layer.id, false);
                      }
                    }}
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
                    ) : isEditing ? (
                      <CanvasInlineTextEditor
                        layer={layer}
                        printAreaHeight={printArea.height}
                        onChange={(text) => onTextPatch(layer.id, { text })}
                        onCommit={finishTextEdit}
                        onCancel={finishTextEdit}
                      />
                    ) : layer.text ? (
                      <span
                        className="whitespace-pre px-1 text-center select-none"
                        style={{
                          fontFamily: resolveFontFamily(layer.fontFamily),
                          fontSize: `calc(${(layer.fontSize_cm * layer.scale) / printArea.height} * 100cqh)`,
                          lineHeight: 1.3,
                          fontWeight: layer.fontWeight,
                          color: layer.color,
                          opacity: layer.opacity,
                        }}
                      >
                        {layer.text}
                      </span>
                    ) : (
                      <span
                        className="flex h-full w-full items-center justify-center border border-dashed border-zinc-400/60 px-1 text-center text-[10px] leading-tight text-zinc-400 select-none"
                        aria-hidden
                      >
                        雙擊輸入文字
                      </span>
                    )}
                  </PrintAreaElement>
                );
              })}

              <ElementAlignmentGuides
                vertical={snapGuides.elementVertical}
                horizontal={snapGuides.elementHorizontal}
                printArea={printArea}
              />
              <PrintAreaCenterGuides
                highlightX={snapGuides.printCenterX}
                highlightY={snapGuides.printCenterY}
              />
              </div>

              <div
                data-layer-actions
                className="pointer-events-none absolute z-20 overflow-visible"
                style={printAreaStyle}
              >
                {showPrimaryActions && primaryActionRect && primaryLayer && (
                  <LayerFloatingControls
                    printArea={printArea}
                    x={primaryActionRect.x_cm}
                    y={primaryActionRect.y_cm}
                    width={primaryActionRect.width_cm}
                    height={primaryActionRect.height_cm}
                    rotation={primaryLayer.rotation}
                    onMove={(next) =>
                      onLayerTransformChange(primaryLayer.id, {
                        x_cm: next.x_cm,
                        y_cm: next.y_cm,
                      })
                    }
                    onScaleDown={() =>
                      onLayerTransformChange(primaryLayer.id, {
                        x_cm: primaryLayer.x_cm,
                        y_cm: primaryLayer.y_cm,
                        scale: primaryLayer.scale * 0.9,
                      })
                    }
                    onScaleUp={() =>
                      onLayerTransformChange(primaryLayer.id, {
                        x_cm: primaryLayer.x_cm,
                        y_cm: primaryLayer.y_cm,
                        scale: primaryLayer.scale * 1.1,
                      })
                    }
                    onRotationChange={(rotation) =>
                      onLayerRotationChange(primaryLayer.id, rotation)
                    }
                    onDelete={() => onDeleteLayer(primaryLayer.id)}
                  />
                )}
              </div>
            </ShirtContainerFrame>
          </div>

          <ClothingBrowsePanel
            gender={gender}
            side={side}
            shirtColor={shirtColor}
            size={size}
            layers={layers}
            onExpand={() => setShowClothingBrowse(true)}
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
          readOnly={readOnly}
          warnings={warnings}
          onUpload={onUpload}
          onAddText={onAddText}
        />
      </div>

      <DesignReviewModal
        open={showDesignReview}
        gender={gender}
        shirtColor={shirtColor}
        size={size}
        layersByTemplate={layersByTemplate}
        onClose={() => setShowDesignReview(false)}
      />

      <ClothingBrowseModal
        open={showClothingBrowse}
        gender={gender}
        shirtColor={shirtColor}
        size={size}
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
              清除目前面向設計？
            </h3>
            <p className="mt-2 text-sm text-zinc-900">
              將刪除目前模特「{sideLabel}」的所有圖片與文字圖層，其他模板與面向不受影響。
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
              >
                取消
              </button>
              {hasAnyDesignContent && (
                <button
                  type="button"
                  onClick={() => {
                    setShowClearConfirm(false);
                    onClearAllDesign();
                  }}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  清除全部模板
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirm(false);
                  onClearCurrentSlotDesign();
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                清除目前面向
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
