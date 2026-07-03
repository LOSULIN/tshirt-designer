"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignmentToolbar } from "./AlignmentToolbar";
import { PlacementPresetCalibrationPanel } from "./PlacementPresetCalibrationPanel";
import { PlacementPresetToolbar } from "./PlacementPresetToolbar";
import { CanvasInlineTextEditor } from "./CanvasInlineTextEditor";
import { LayerFloatingControls } from "./LayerFloatingControls";
import { getAdultTshirtTemplateSrc } from "@/lib/constants";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import {
  resolveLayerCmRect,
} from "@/lib/coordinate-runtime";
import {
  createDesignerDisplayContext,
  getDesignerPrintableArea,
  getLayerDesignerDisplayCssPercent,
} from "@/lib/designer-display-projection";
import {
  buildDisplayBlueFrameTooltip,
} from "@/lib/designer-display-scale";
import {
  getDesignerWorkspaceContainerStyle,
  getDesignerWorkspacePrintAreaCm,
} from "@/lib/designer-workspace";
import type { PreviewPrintPositionMode } from "@/lib/printArea";
import { ShirtContainerFrame } from "./ShirtContainerFrame";
import type { Gender, ShirtColor, Side, Size } from "@/lib/constants";
import { DESIGN_SIDES, hasAnyDesign, hasDesignInSlot } from "@/lib/design-state";
import type { DesignLayersByTemplate } from "@/lib/types";
import { guidesEqual } from "@/lib/element-snap";
import {
  countAlignableLayers,
  getAlignmentGuidesForSelection,
  type LayerAlignmentAxis,
} from "@/lib/layer-alignment";
import { getLayersForCanvasRender } from "@/lib/layer-system";
import { isHistoryShortcutTarget } from "@/lib/design-history";
import { getRasterMaxPrintSizeCm } from "@/lib/image-print-quality";
import { buildCurrentGarmentConstraintMap } from "@/lib/current-garment-print-constraint";
import {
  countGarmentConstraintViolations,
  formatGarmentConstraintLayerWarning,
  formatGarmentConstraintStatusWarning,
} from "@/lib/garment-constraint-ux";
import {
  getGarmentPrintStatus,
  getLayerConstraintBadgeMeta,
} from "@/lib/garment-constraint-ux-polish";
import type { PlacementPresetId } from "@/lib/placement-presets";
import {
  buildDesignerSnapTargetsFromLayers,
  getDesignerGridSizeCm,
} from "@/lib/designer-coordinate-controller";
import type {
  DesignLayer,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "@/lib/types";
import { DesignWorkspaceStatusBar } from "./DesignWorkspaceStatusBar";
import { CurrentGarmentConstraintVisualization } from "./CurrentGarmentConstraintVisualization";
import { CanvasInfoPanel } from "./CanvasInfoPanel";
import { LayerPreviewContent } from "./LayerPreviewContent";
import { UI_VISIBILITY } from "./ui-visibility";
import { ClothingBrowseModal } from "./ClothingBrowseModal";
import { ClothingBrowsePanel } from "./ClothingBrowsePanel";
import { DesignReviewModal } from "./DesignReviewModal";
import { DesignToolbar } from "./DesignToolbar";
import { ProcessedTemplateImage } from "./ProcessedTemplateImage";
import { ElementAlignmentGuides } from "./ElementAlignmentGuides";
import {
  PrintAreaCenterGuides,
  PrintAreaGrid,
} from "./PrintAreaGrid";
import { PrintAreaDisplayRuler } from "./PrintAreaDisplayRuler";
import { PrintAreaDebugOverlay } from "./PrintAreaDebugOverlay";
import { CanvasCenterDebugOverlay } from "./CanvasCenterDebugOverlay";
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

/** @temporary 畫布中心點十字線 debug；對位完成後移除 */
const SHOW_CENTER_DEBUG_MARKERS = true;

const ZOOM_STEPS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75];
const MIN_CANVAS_ZOOM = 0.75;
const MAX_CANVAS_ZOOM = 1.75;

/** Factory Overlay 使用 1:1 模板座標；預設 zoom 固定 1（不依尺碼補償 visual scale） */
const DEFAULT_CANVAS_ZOOM_INDEX = ZOOM_STEPS.indexOf(1);

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
  debugPrintArea = false,
  previewPrintPositionMode = "garment",
  gridSnapEnabled,
  largePrintModeEnabled,
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
  onQuickRotate90,
  onLayerResize,
  onClearSelection,
  onFocusTextEditorConsumed,
  onSideChange,
  onDuplicateLayer,
  onDeleteLayer,
  onMoveLayer,
  onUpload,
  onAddText,
  onAddShape,
  onTextStylePatch,
  onImageStylePatch,
  onShapeStylePatch,
  onTextChange,
  onClearCurrentSlotDesign,
  onClearAllDesign,
  onTextPatch,
  onImageTransform,
  onImageResize,
  onRotationChange,
  onAlignLayers,
  onApplyPlacementPreset,
  activePlacementPresetId = null,
  bluePrintArea: bluePrintAreaProp,
  onFitToPrintableArea,
}: {
  gender: Gender;
  shirtColor: ShirtColor;
  size: Size;
  side: Side;
  layers: DesignLayer[];
  layersByTemplate: DesignLayersByTemplate;
  selectedIds: string[];
  showGrid: boolean;
  debugPrintArea?: boolean;
  previewPrintPositionMode?: PreviewPrintPositionMode;
  gridSnapEnabled: boolean;
  largePrintModeEnabled: boolean;
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
  /** R / Shift+R：順／逆時針 90° */
  onQuickRotate90: (clockwise: boolean) => void;
  onLayerResize: (
    id: string,
    next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
    lockAspect?: boolean,
  ) => void;
  onClearSelection: () => void;
  onFocusTextEditorConsumed: () => void;
  onSideChange: (side: Side) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayer: (id: string, action: "top" | "up" | "down" | "bottom") => void;
  onUpload: (file: File) => void;
  onAddText: () => void;
  onAddShape: (kind: ShapeDesignLayer["shapeKind"]) => void;
  onTextStylePatch: (id: string, patch: Partial<TextDesignLayer>) => void;
  onImageStylePatch: (id: string, patch: Partial<ImageDesignLayer>) => void;
  onShapeStylePatch: (id: string, patch: Partial<ShapeDesignLayer>) => void;
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
  onAlignLayers: (axis: LayerAlignmentAxis) => void;
  onApplyPlacementPreset: (presetId: PlacementPresetId) => void;
  activePlacementPresetId?: PlacementPresetId | null;
  /** 尺碼藍框（Designer Config）；僅供目前可印尺寸與溢出判斷 */
  bluePrintArea?: PrintAreaCmBounds;
  /** Phase 14.2：使用者主動「適合可印範圍」 */
  onFitToPrintableArea?: (layerId: string) => void;
}) {
  const [snapGuides, setSnapGuides] = useState<SnapGuidesState>(EMPTY_GUIDES);
  const alignGuideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_CANVAS_ZOOM_INDEX);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDesignReview, setShowDesignReview] = useState(false);
  const [showClothingBrowse, setShowClothingBrowse] = useState(false);
  const hasCurrentSlotDesign = layers.length > 0;
  const hasAnyDesignContent = hasAnyDesign(layersByTemplate);
  const rasterMaxPrintSize = useMemo(
    () => getRasterMaxPrintSizeCm(largePrintModeEnabled),
    [largePrintModeEnabled],
  );
  const sideLabel = side === "front" ? "正面" : "背面";
  const canReviewGenderDesign = DESIGN_SIDES.some((s) =>
    hasDesignInSlot(layersByTemplate, gender, s),
  );

  const templateSrc = getAdultTshirtTemplateSrc(shirtColor, side);
  /** 目前尺碼允許的最大可印尺寸（Constraint / Status Bar Display；經 Facade） */
  const designerCoordinateContext = useMemo(
    () => createDesignerDisplayContext(side, size),
    [side, size],
  );
  const designerPrintableArea = useMemo(
    () => getDesignerPrintableArea(designerCoordinateContext),
    [designerCoordinateContext],
  );
  const designerGridSizeCm = useMemo(
    () => getDesignerGridSizeCm(designerCoordinateContext),
    [designerCoordinateContext],
  );
  const currentMaxPrintBounds = useMemo((): PrintAreaCmBounds => {
    if (bluePrintAreaProp) return bluePrintAreaProp;
    return designerPrintableArea;
  }, [bluePrintAreaProp, designerPrintableArea]);
  /** 固定設計工作區 cm 分母（M 基準；圖層在畫布上的視覺定位） */
  const workspacePrintArea = useMemo(
    () => getDesignerWorkspacePrintAreaCm(side),
    [side],
  );
  const printArea = workspacePrintArea;
  const workspaceStyle = useMemo(
    () => getDesignerWorkspaceContainerStyle(side),
    [side],
  );
  const visibleLayers = useMemo(
    () => getLayersForCanvasRender(layers).filter((l) => l.visible),
    [layers],
  );
  const layerConstraintById = useMemo(
    () => buildCurrentGarmentConstraintMap(visibleLayers, side, size),
    [visibleLayers, side, size],
  );
  const hasWorkspaceOverflow = useMemo(
    () =>
      [...layerConstraintById.values()].some(
        (state) => state.exceedsGarmentPrintArea,
      ),
    [layerConstraintById],
  );
  const garmentConstraintViolationCount = useMemo(
    () =>
      countGarmentConstraintViolations(
        [...layerConstraintById.values()].map((state) => ({
          exceedsGarmentPrintArea: state.exceedsGarmentPrintArea,
          violationEdges: state.violationEdges,
        })),
      ),
    [layerConstraintById],
  );
  const garmentConstraintStatusWarning = useMemo(
    () =>
      formatGarmentConstraintStatusWarning(
        garmentConstraintViolationCount,
        size,
        currentMaxPrintBounds,
      ),
    [garmentConstraintViolationCount, size, currentMaxPrintBounds],
  );
  const constraintOverlayDescription = useMemo(
    () =>
      UI_VISIBILITY.showEngineeringOverlays
        ? buildDisplayBlueFrameTooltip({
            side,
            size,
            garmentPrintable: currentMaxPrintBounds,
          })
        : undefined,
    [side, size, currentMaxPrintBounds],
  );
  const garmentPrintStatus = useMemo(
    () =>
      getGarmentPrintStatus(
        garmentConstraintViolationCount,
        size,
        currentMaxPrintBounds,
      ),
    [garmentConstraintViolationCount, size, currentMaxPrintBounds],
  );
  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const primaryLayer = layers.find((layer) => layer.id === primaryId) ?? null;
  const primaryOverflowExceeds =
    primaryId != null
      ? (layerConstraintById.get(primaryId)?.exceedsGarmentPrintArea ?? false)
      : false;
  const interactionLocked = isBusy || readOnly;

  const showPrimaryActions =
    primaryLayer != null &&
    !primaryLayer.locked &&
    !interactionLocked &&
    editingTextId !== primaryLayer.id;
  const primaryActionRect = useMemo(() => {
    if (!primaryLayer) return null;
    return resolveLayerCmRect(primaryLayer, { purpose: "designer" });
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
      if (isHistoryShortcutTarget(e.target)) return;
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
        return;
      }
      if (
        (e.key === "r" || e.key === "R") &&
        selectedIds.length > 0 &&
        !interactionLocked
      ) {
        e.preventDefault();
        onQuickRotate90(!e.shiftKey);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    editingTextId,
    selectedIds,
    layers,
    interactionLocked,
    onDeleteLayer,
    onQuickRotate90,
  ]);

  const finishTextEdit = useCallback(() => {
    setEditingTextId(null);
  }, []);

  const alignableCount = useMemo(
    () => countAlignableLayers(layers, selectedIds),
    [layers, selectedIds],
  );

  const handleAlign = useCallback(
    (axis: LayerAlignmentAxis) => {
      if (isBusy || readOnly || alignableCount === 0) return;

      const guides = getAlignmentGuidesForSelection(
        layers,
        selectedIds,
        axis,
        printArea,
      );
      onAlignLayers(axis);

      if (guides) {
        if (alignGuideTimerRef.current) {
          clearTimeout(alignGuideTimerRef.current);
        }
        setSnapGuides({
          printCenterX: false,
          printCenterY: false,
          elementVertical: guides.vertical,
          elementHorizontal: guides.horizontal,
        });
        alignGuideTimerRef.current = setTimeout(() => {
          setSnapGuides(EMPTY_GUIDES);
          alignGuideTimerRef.current = null;
        }, 700);
      }
    },
    [
      alignableCount,
      isBusy,
      layers,
      onAlignLayers,
      printArea,
      readOnly,
      selectedIds,
    ],
  );

  useEffect(
    () => () => {
      if (alignGuideTimerRef.current) {
        clearTimeout(alignGuideTimerRef.current);
      }
    },
    [],
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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-1">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-3 py-1.5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">設計工作區</h2>
            <p className="text-[10px] text-zinc-500">{sideLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {UI_VISIBILITY.showDesignBrowseButton && (
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
            )}
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

        <AlignmentToolbar
          disabled={isBusy || readOnly || alignableCount === 0}
          onAlign={handleAlign}
        />

        <PlacementPresetToolbar
          side={side}
          disabled={isBusy || readOnly}
          activePresetId={activePlacementPresetId}
          selectionOverflow={primaryOverflowExceeds}
          onApplyPreset={onApplyPlacementPreset}
        />

        {debugPrintArea && (
          <PlacementPresetCalibrationPanel
            side={side}
            size={size}
            selectedLayer={primaryLayer}
          />
        )}

        <DesignWorkspaceStatusBar
          size={size}
          maxPrintBounds={currentMaxPrintBounds}
          hasOverflow={hasWorkspaceOverflow}
          violationCount={garmentConstraintViolationCount}
          statusWarning={garmentConstraintStatusWarning}
          printStatus={garmentPrintStatus}
        />

        <div className="relative flex min-h-0 flex-1 overflow-hidden bg-zinc-100">
          {UI_VISIBILITY.showCanvasInfoPanel && (
            <CanvasInfoPanel
              layers={layers}
              selectedLayerIds={selectedIds}
              side={side}
              size={size}
              isBusy={isBusy}
              readOnly={readOnly}
              largePrintModeEnabled={largePrintModeEnabled}
              onSelectLayer={(id) => onSelectLayer(id, false)}
              onDeleteLayer={onDeleteLayer}
              onLayerResize={onImageResize}
              onTextPatch={onTextStylePatch}
              onImagePatch={onImageStylePatch}
              onShapePatch={onShapeStylePatch}
            />
          )}

          <div className="@container relative z-0 flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-2">
            <ShirtContainerFrame
              canvasRoot
              fitRatio={PREVIEW_FIT_RATIO}
              zoom={zoom}
              className="relative z-0 transition-transform duration-200"
              onPointerDown={() => onClearSelection()}
            >
                <ProcessedTemplateImage
                  gender={gender}
                  side={side}
                  src={templateSrc}
                  alt="服飾模板"
                  className="absolute inset-0 z-0 h-full w-full object-contain"
                />
              <div
                data-design-workspace
                data-print-area
                className={`absolute z-10 overflow-hidden border-2 border-dashed [container-type:size] ${
                  debugPrintArea
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-blue-500 bg-blue-500/5"
                }`}
                style={workspaceStyle}
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
              {UI_VISIBILITY.showEngineeringOverlays && (
                <CurrentGarmentConstraintVisualization
                  side={side}
                  size={size}
                  workspacePrintArea={workspacePrintArea}
                  garmentPrintArea={currentMaxPrintBounds}
                  description={constraintOverlayDescription}
                />
              )}
              <PrintAreaDisplayRuler printableArea={designerPrintableArea} />
              <PrintAreaGrid
                visible={showGrid}
                printArea={designerPrintableArea}
                gridSizeCm={designerGridSizeCm}
              />

              {visibleLayers.map((layer) => {
                const isActive = selectedIds.includes(layer.id);
                const isPrimary = layer.id === primaryId;
                const isEditing = editingTextId === layer.id;
                const showControls =
                  isPrimary &&
                  !layer.locked &&
                  !interactionLocked &&
                  !isEditing;
                const rect = resolveLayerCmRect(layer, { purpose: "designer" });
                const scale =
                  layer.type === "image" || layer.type === "shape"
                    ? layer.scale
                    : 1;
                const imageMaxResize =
                  layer.type === "image"
                    ? {
                        maxResizeWidth_cm: rasterMaxPrintSize.width_cm,
                        maxResizeHeight_cm: rasterMaxPrintSize.height_cm,
                      }
                    : {};
                const layerConstraint = layerConstraintById.get(layer.id);
                const constraintWarningLabel =
                  layerConstraint != null
                    ? formatGarmentConstraintLayerWarning({
                        exceedsGarmentPrintArea:
                          layerConstraint.exceedsGarmentPrintArea,
                        violationEdges: layerConstraint.violationEdges,
                      })
                    : null;
                const constraintBadge =
                  layerConstraint != null
                    ? getLayerConstraintBadgeMeta(
                        {
                          exceedsGarmentPrintArea:
                            layerConstraint.exceedsGarmentPrintArea,
                          violationEdges: layerConstraint.violationEdges,
                        },
                        layer.name,
                      )
                    : null;
                const layerDisplayPercentStyle = getLayerDesignerDisplayCssPercent(
                  {
                    x_cm: rect.x_cm,
                    y_cm: rect.y_cm,
                    width_cm: rect.width_cm,
                    height_cm: rect.height_cm,
                  },
                  designerCoordinateContext,
                );

                return (
                  <PrintAreaElement
                    key={layer.id}
                    layer={layer}
                    designerPointerContext={designerCoordinateContext}
                    printArea={printArea}
                    displayPercentStyle={layerDisplayPercentStyle}
                    {...imageMaxResize}
                    hasPrintAreaOverflow={
                      layerConstraint?.exceedsGarmentPrintArea ?? false
                    }
                    constraintWarningLabel={
                      constraintWarningLabel || null
                    }
                    constraintBadge={constraintBadge}
                    gridSnapEnabled={gridSnapEnabled}
                    elementSnapEnabled
                    elementSnapDistance={elementSnapDistance}
                    otherElements={buildDesignerSnapTargetsFromLayers(
                      layer.id,
                      layers,
                      designerCoordinateContext,
                    )}
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
                            onLayerResize(
                              layer.id,
                              {
                                x_cm: next.x,
                                y_cm: next.y,
                                width_cm: next.width,
                                height_cm: next.height,
                              },
                              false,
                            )
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
                    {layer.type === "text" && isEditing ? (
                      <CanvasInlineTextEditor
                        layer={layer}
                        printAreaHeight={printArea.height}
                        onChange={(text) => onTextPatch(layer.id, { text })}
                        onCommit={finishTextEdit}
                        onCancel={finishTextEdit}
                      />
                    ) : layer.type === "text" && !layer.text ? (
                      <span
                        className="flex h-full w-full items-center justify-center border border-dashed border-zinc-400/60 px-1 text-center text-[10px] leading-tight text-zinc-400 select-none"
                        aria-hidden
                      >
                        雙擊輸入文字
                      </span>
                    ) : (
                      <LayerPreviewContent layer={layer} printArea={printArea} />
                    )}
                  </PrintAreaElement>
                );
              })}

              <ElementAlignmentGuides
                vertical={snapGuides.elementVertical}
                horizontal={snapGuides.elementHorizontal}
                printArea={designerPrintableArea}
              />
              <PrintAreaCenterGuides
                highlightX={snapGuides.printCenterX}
                highlightY={snapGuides.printCenterY}
              />
              </div>

              <div
                data-layer-actions
                className="pointer-events-none absolute z-20 overflow-visible"
                style={workspaceStyle}
              >
                {showPrimaryActions && primaryActionRect && primaryLayer && (
                  <LayerFloatingControls
                    printArea={printArea}
                    hasPrintAreaOverflow={
                      layerConstraintById.get(primaryLayer.id)
                        ?.exceedsGarmentPrintArea ?? false
                    }
                    onFitToPrintableArea={
                      onFitToPrintableArea
                        ? () => onFitToPrintableArea(primaryLayer.id)
                        : undefined
                    }
                    displayPercentStyle={getLayerDesignerDisplayCssPercent(
                      {
                        x_cm: primaryActionRect.x_cm,
                        y_cm: primaryActionRect.y_cm,
                        width_cm: primaryActionRect.width_cm,
                        height_cm: primaryActionRect.height_cm,
                      },
                      designerCoordinateContext,
                    )}
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
                    onRotateLeft90={() => onQuickRotate90(false)}
                    onRotateRight90={() => onQuickRotate90(true)}
                    onDelete={() => onDeleteLayer(primaryLayer.id)}
                  />
                )}
              </div>
              {debugPrintArea && (
                <PrintAreaDebugOverlay
                  side={side}
                  size={size}
                  selectedLayer={primaryLayer}
                />
              )}
              {SHOW_CENTER_DEBUG_MARKERS && (
                <CanvasCenterDebugOverlay
                  side={side}
                  size={size}
                  previewPrintPositionMode={previewPrintPositionMode}
                />
              )}
            </ShirtContainerFrame>
          </div>

          <ClothingBrowsePanel
            gender={gender}
            side={side}
            shirtColor={shirtColor}
            size={size}
            layers={layers}
            previewPrintPositionMode={previewPrintPositionMode}
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
          onAddShape={onAddShape}
        />
      </div>

      <DesignReviewModal
        open={showDesignReview}
        gender={gender}
        shirtColor={shirtColor}
        size={size}
        layersByTemplate={layersByTemplate}
        previewPrintPositionMode={previewPrintPositionMode}
        onClose={() => setShowDesignReview(false)}
      />

      <ClothingBrowseModal
        open={showClothingBrowse}
        gender={gender}
        shirtColor={shirtColor}
        size={size}
        layersByTemplate={layersByTemplate}
        previewPrintPositionMode={previewPrintPositionMode}
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
