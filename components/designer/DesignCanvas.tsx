"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DesignerAlignmentToolbar } from "./DesignerAlignmentToolbar";
import { ContextToolbar } from "./ContextToolbar";
import { ContextToolbarEmptyState } from "./ContextToolbarEmptyState";
import { DesignerTooltip } from "./DesignerTooltip";
import { PlacementPresetCalibrationPanel } from "./PlacementPresetCalibrationPanel";
import { PlacementPresetToolbar } from "./PlacementPresetToolbar";
import { CanvasInlineTextEditor } from "./CanvasInlineTextEditor";
import { LayerFloatingControls } from "./LayerFloatingControls";
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
  getDesignerWorkspacePrintAreaCm,
} from "@/lib/designer-workspace";
import { resolveDesignerTemplateAsset } from "@/lib/designer-geometry-v2/designer-template-runtime";
import { resolveDesignerRuntimeWorkspace } from "@/lib/designer-geometry-v2/designer-runtime-workspace";
import { useGeometryRuntime } from "@/lib/designer-geometry-v2/geometry-runtime-context";
import { DesignerGarmentPresentation } from "./DesignerGarmentPresentation";
import { PrintAreaDebugOverlay } from "./PrintAreaDebugOverlay";
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
  getDesignerGridSizeCm,
} from "@/lib/designer-coordinate-controller";
import {
  type DesignerSnapTargetCache,
} from "@/lib/designer/snap-target-cache";
import {
  invalidateDesignerCacheStores,
  resolveDesignerConstraintMap,
  resolveDesignerSnapTargetCache,
  type DesignerConstraintCacheStore,
  type DesignerSnapTargetCacheStore,
} from "@/lib/designer/designer-cache-version";
import {
  createGuideRafScheduler,
  snapGuidesAreEmpty,
} from "@/lib/designer/guide-raf-scheduler";
import type { DesignerCoordinateContext } from "@/lib/designer-coordinate-facade";
import type { GarmentConstraintBadgeMeta } from "@/lib/garment-constraint-ux-polish";
import type {
  DesignLayer,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "@/lib/types";
import { DesignWorkspaceStatusBar } from "./DesignWorkspaceStatusBar";
import { CurrentGarmentConstraintVisualization } from "./CurrentGarmentConstraintVisualization";
import { ArtworkSizePanel } from "./ArtworkSizePanel";
import { CanvasInfoPanel } from "./CanvasInfoPanel";
import { LayerPreviewContent } from "./LayerPreviewContent";
import { UI_VISIBILITY } from "./ui-visibility";
import { DesignReviewModal } from "./DesignReviewModal";
import { DesignToolbar } from "./DesignToolbar";
import { ds } from "./design-ui";
import { tb } from "./toolbar-interaction-ui";
import { ProcessedTemplateImage } from "./ProcessedTemplateImage";
import { ElementAlignmentGuides } from "./ElementAlignmentGuides";
import {
  PrintAreaCenterGuides,
  PrintAreaGrid,
} from "./PrintAreaGrid";
import { PrintAreaDisplayRuler } from "./PrintAreaDisplayRuler";
import { GeometryDebugConsole } from "./GeometryDebugConsole";
import { GeometryRuntimeDebugOverlay } from "./GeometryRuntimeDebugOverlay";
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

type PrintAreaLayerItemProps = {
  layer: DesignLayer;
  isActive: boolean;
  isPrimary: boolean;
  isEditing: boolean;
  interactionLocked: boolean;
  readOnly: boolean;
  designerCoordinateContext: DesignerCoordinateContext;
  designerSnapTargetCacheRef: React.RefObject<DesignerSnapTargetCache>;
  printArea: PrintAreaCmBounds;
  gridSnapEnabled: boolean;
  elementSnapDistance: number;
  maxResizeWidth_cm?: number;
  maxResizeHeight_cm?: number;
  hasPrintAreaOverflow: boolean;
  constraintWarningLabel: string | null;
  constraintBadge: GarmentConstraintBadgeMeta | null;
  onLayerSelect: (layerId: string, shiftKey: boolean) => void;
  onLayerTransform: (
    layerId: string,
    patch: { x_cm: number; y_cm: number; scale?: number },
  ) => void;
  onLayerResize: (
    layerId: string,
    patch: {
      x_cm: number;
      y_cm: number;
      width_cm: number;
      height_cm: number;
    },
    lockAspect: boolean,
  ) => void;
  onLayerDoubleClick: (
    layerId: string,
    layerType: DesignLayer["type"],
    locked: boolean,
  ) => void;
  onSnapGuidesChange: (guides: SnapGuidesState) => void;
  onDragTransformFlush?: () => void;
  onDragTransformCancel?: () => void;
  onTextPatch: (
    layerId: string,
    patch: { text: string },
  ) => void;
  finishTextEdit: () => void;
};

function PrintAreaLayerItem({
  layer,
  isActive,
  isPrimary,
  isEditing,
  interactionLocked,
  readOnly,
  designerCoordinateContext,
  designerSnapTargetCacheRef,
  printArea,
  gridSnapEnabled,
  elementSnapDistance,
  maxResizeWidth_cm,
  maxResizeHeight_cm,
  hasPrintAreaOverflow,
  constraintWarningLabel,
  constraintBadge,
  onLayerSelect,
  onLayerTransform,
  onLayerResize,
  onLayerDoubleClick,
  onSnapGuidesChange,
  onDragTransformFlush,
  onDragTransformCancel,
  onTextPatch,
  finishTextEdit,
}: PrintAreaLayerItemProps) {
  const showControls =
    isPrimary && !layer.locked && !interactionLocked && !isEditing;
  const rect = useMemo(
    () => resolveLayerCmRect(layer, { purpose: "designer" }),
    [layer],
  );
  const scale =
    layer.type === "image" || layer.type === "shape" ? layer.scale : 1;
  const displayPercentStyle = useMemo(
    () =>
      getLayerDesignerDisplayCssPercent(
        {
          x_cm: rect.x_cm,
          y_cm: rect.y_cm,
          width_cm: rect.width_cm,
          height_cm: rect.height_cm,
        },
        designerCoordinateContext,
      ),
    [
      rect.x_cm,
      rect.y_cm,
      rect.width_cm,
      rect.height_cm,
      designerCoordinateContext,
    ],
  );

  const onSelect = useCallback(
    (shiftKey: boolean) => onLayerSelect(layer.id, shiftKey),
    [layer.id, onLayerSelect],
  );
  const onTransformChange = useCallback(
    (next: { x: number; y: number; scale?: number }) =>
      onLayerTransform(layer.id, {
        x_cm: next.x,
        y_cm: next.y,
        scale: next.scale,
      }),
    [layer.id, onLayerTransform],
  );
  const onResizeChange = useCallback(
    (next: { x: number; y: number; width: number; height: number }) =>
      onLayerResize(
        layer.id,
        {
          x_cm: next.x,
          y_cm: next.y,
          width_cm: next.width,
          height_cm: next.height,
        },
        false,
      ),
    [layer.id, onLayerResize],
  );
  const onDoubleClick = useCallback(
    () => onLayerDoubleClick(layer.id, layer.type, layer.locked),
    [layer.id, layer.type, layer.locked, onLayerDoubleClick],
  );
  const onTextChange = useCallback(
    (text: string) => onTextPatch(layer.id, { text }),
    [layer.id, onTextPatch],
  );

  return (
    <PrintAreaElement
      layer={layer}
      layerId={layer.id}
      designerPointerContext={designerCoordinateContext}
      designerSnapTargetCacheRef={designerSnapTargetCacheRef}
      printArea={printArea}
      displayPercentStyle={displayPercentStyle}
      maxResizeWidth_cm={maxResizeWidth_cm}
      maxResizeHeight_cm={maxResizeHeight_cm}
      hasPrintAreaOverflow={hasPrintAreaOverflow}
      constraintWarningLabel={constraintWarningLabel}
      constraintBadge={constraintBadge}
      gridSnapEnabled={gridSnapEnabled}
      elementSnapEnabled
      elementSnapDistance={elementSnapDistance}
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
      onSelect={onSelect}
      onTransformChange={onTransformChange}
      onResizeChange={showControls ? onResizeChange : undefined}
      onDoubleClick={onDoubleClick}
      onSnapGuidesChange={onSnapGuidesChange}
      onDragTransformFlush={onDragTransformFlush}
      onDragTransformCancel={onDragTransformCancel}
    >
      {layer.type === "text" && isEditing ? (
        <CanvasInlineTextEditor
          layer={layer}
          printAreaHeight={printArea.height}
          onChange={onTextChange}
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
}

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
  onDragTransformFlush,
  onDragTransformCancel,
  onQuickRotate90,
  onLayerResize,
  onLayerToolbarScale,
  onClearSelection,
  onFocusTextEditorConsumed,
  onSideChange,
  onDuplicateLayer,
  onDeleteLayer,
  onMoveLayer,
  onRenameLayer,
  onToggleVisible,
  onToggleLocked,
  onReorderDrag,
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
  onArtworkSizePatch,
  onBoostImageResolution,
  onRotationChange,
  onAlignLayers,
  onApplyPlacementPreset,
  activePlacementPresetId = null,
  bluePrintArea: bluePrintAreaProp,
  onFitToPrintableArea,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
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
  /** RAF scheduler: flush pending canvas drag transform on pointerup */
  onDragTransformFlush?: () => void;
  /** RAF scheduler: drop pending canvas drag transform on pointercancel */
  onDragTransformCancel?: () => void;
  /** R / Shift+R：順／逆時針 90° */
  onQuickRotate90: (clockwise: boolean) => void;
  onLayerResize: (
    id: string,
    next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
    lockAspect?: boolean,
  ) => void;
  onLayerToolbarScale: (id: string, factor: number) => void;
  onClearSelection: () => void;
  onFocusTextEditorConsumed: () => void;
  onSideChange: (side: Side) => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayer: (id: string, action: "top" | "up" | "down" | "bottom") => void;
  onRenameLayer: (id: string, name: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onReorderDrag: (dragId: string, targetId: string) => void;
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
  onArtworkSizePatch: (
    id: string,
    patch: { width_cm?: number; height_cm?: number },
  ) => void;
  onBoostImageResolution?: (id: string) => void | Promise<void>;
  onRotationChange: (id: string, rotation: number) => void;
  onAlignLayers: (axis: LayerAlignmentAxis) => void;
  onApplyPlacementPreset: (presetId: PlacementPresetId) => void;
  activePlacementPresetId?: PlacementPresetId | null;
  /** 尺碼藍框（Designer Config）；僅供目前可印尺寸與溢出判斷 */
  bluePrintArea?: PrintAreaCmBounds;
  /** Phase 14.2：使用者主動「適合可印範圍」 */
  onFitToPrintableArea?: (layerId: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  const [snapGuides, setSnapGuides] = useState<SnapGuidesState>(EMPTY_GUIDES);
  const commitSnapGuidesRef = useRef<(guides: SnapGuidesState) => void>(() => {});
  const guideSchedulerRef = useRef(
    createGuideRafScheduler((guides) => commitSnapGuidesRef.current(guides)),
  );
  const alignGuideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_CANVAS_ZOOM_INDEX);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDesignReview, setShowDesignReview] = useState(false);
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

  const geometryRuntime = useGeometryRuntime();
  const effectiveGeometryVersion =
    geometryRuntime.getEffectiveGeometryVersion("designer");
  const templateSrc = useMemo(
    () =>
      resolveDesignerTemplateAsset(side, shirtColor, effectiveGeometryVersion),
    [side, shirtColor, effectiveGeometryVersion],
  );

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
  const designerRuntimeWorkspace = useMemo(
    () => resolveDesignerRuntimeWorkspace(side, effectiveGeometryVersion),
    [side, effectiveGeometryVersion],
  );
  const workspaceStyle = designerRuntimeWorkspace.workspaceStyle;
  const safeAreaStyle = designerRuntimeWorkspace.safeAreaStyle;
  const visibleLayers = useMemo(
    () => getLayersForCanvasRender(layers).filter((l) => l.visible),
    [layers],
  );
  const designerSnapCacheStoreRef = useRef<DesignerSnapTargetCacheStore | null>(
    null,
  );
  const designerConstraintCacheStoreRef =
    useRef<DesignerConstraintCacheStore | null>(null);
  const designerSnapTargetCache = useMemo(
    () =>
      resolveDesignerSnapTargetCache(
        layers,
        designerCoordinateContext,
        designerSnapCacheStoreRef,
      ),
    [layers, designerCoordinateContext],
  );
  const designerSnapTargetCacheRef = useRef(designerSnapTargetCache);
  designerSnapTargetCacheRef.current = designerSnapTargetCache;
  const layerConstraintById = useMemo(
    () =>
      resolveDesignerConstraintMap(
        visibleLayers,
        side,
        size,
        designerConstraintCacheStoreRef,
      ),
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
  const showContextToolbar =
    primaryLayer != null && !readOnly && !primaryLayer.locked;
  const historyDisabled = isBusy || readOnly;
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
      guideSchedulerRef.current.destroy();
    },
    [],
  );

  const commitSnapGuides = useCallback((guides: SnapGuidesState) => {
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
  commitSnapGuidesRef.current = commitSnapGuides;

  const handleSnapGuides = useCallback((guides: SnapGuidesState) => {
    if (snapGuidesAreEmpty(guides)) {
      guideSchedulerRef.current.cancel();
      commitSnapGuides(guides);
      return;
    }
    guideSchedulerRef.current.schedule(guides);
  }, [commitSnapGuides]);

  const handleDragTransformFlush = useCallback(() => {
    guideSchedulerRef.current.flush();
    invalidateDesignerCacheStores(
      designerSnapCacheStoreRef,
      designerConstraintCacheStoreRef,
    );
    onDragTransformFlush?.();
  }, [onDragTransformFlush]);

  const handleDragTransformCancel = useCallback(() => {
    guideSchedulerRef.current.cancel();
    invalidateDesignerCacheStores(
      designerSnapCacheStoreRef,
      designerConstraintCacheStoreRef,
    );
    onDragTransformCancel?.();
  }, [onDragTransformCancel]);

  const layerInteractionRef = useRef({
    onSelectLayer,
    onLayerTransformChange,
    onLayerResize,
    onTextPatch,
    setEditingTextId,
    interactionLocked: false,
  });
  layerInteractionRef.current = {
    onSelectLayer,
    onLayerTransformChange,
    onLayerResize,
    onTextPatch,
    setEditingTextId,
    interactionLocked: isBusy || readOnly,
  };

  const handleLayerSelect = useCallback((layerId: string, shiftKey: boolean) => {
    layerInteractionRef.current.onSelectLayer(layerId, shiftKey);
  }, []);

  const handleLayerTransform = useCallback(
    (
      layerId: string,
      patch: { x_cm: number; y_cm: number; scale?: number },
    ) => {
      layerInteractionRef.current.onLayerTransformChange(layerId, patch);
    },
    [],
  );

  const handleLayerResize = useCallback(
    (
      layerId: string,
      patch: {
        x_cm: number;
        y_cm: number;
        width_cm: number;
        height_cm: number;
      },
      lockAspect: boolean,
    ) => {
      layerInteractionRef.current.onLayerResize(layerId, patch, lockAspect);
    },
    [],
  );

  const handleLayerDoubleClick = useCallback(
    (layerId: string, layerType: DesignLayer["type"], locked: boolean) => {
      const { interactionLocked, setEditingTextId, onSelectLayer } =
        layerInteractionRef.current;
      if (layerType === "text" && !locked && !interactionLocked) {
        setEditingTextId(layerId);
        onSelectLayer(layerId, false);
      }
    },
    [],
  );

  const handleTextPatch = useCallback(
    (layerId: string, patch: { text: string }) => {
      layerInteractionRef.current.onTextPatch(layerId, patch);
    },
    [],
  );

  return (
    <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${ds.space.p2}`}>
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${ds.surface.canvas} ${ds.radius.card} border ${ds.surface.border} ${ds.motion.shadow}`}
      >
        <div
          className={`flex shrink-0 items-center justify-between border-b border-zinc-100 ${ds.space.px3} py-1.5`}
        >
          <div>
            <h2 className={ds.type.title}>設計工作區</h2>
            <p className={ds.type.helper}>{sideLabel}</p>
          </div>
          <div className={`flex items-center ${ds.space.gap2}`}>
            {UI_VISIBILITY.showDesignBrowseButton && (
              <button
                type="button"
                title="瀏覽完整衣服設計（正面與背面）"
                disabled={isBusy || !canReviewGenderDesign}
                onClick={() => setShowDesignReview(true)}
                className={`flex items-center gap-1 ${ds.button.secondary}`}
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
              className={`flex items-center gap-1 ${ds.button.secondary}`}
            >
              <span aria-hidden>↩</span>
              <span>重新設計</span>
            </button>
          </div>
        </div>

        <div className={`shrink-0 border-b border-zinc-100 bg-white ${ds.space.px3} py-1`}>
          <div className="flex flex-col gap-1">
            {/* 單列 Toolbar — 正/背面、版型、狀態、工具、對齊、Undo/Redo */}
            <div
              className={`flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1`}
            >
              <div
                className={`inline-flex shrink-0 gap-0.5 border border-zinc-200 bg-white p-0.5 ${ds.radius.button}`}
              >
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
                    className={`rounded-md px-2 py-0.5 font-medium ${ds.type.body} transition-colors duration-150 ease-out ${
                      side === s
                        ? "bg-blue-700 text-white"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <span className="hidden h-4 w-px shrink-0 bg-zinc-200 md:inline" aria-hidden />

              <PlacementPresetToolbar
                side={side}
                disabled={isBusy || readOnly}
                activePresetId={activePlacementPresetId}
                selectionOverflow={primaryOverflowExceeds}
                onApplyPreset={onApplyPlacementPreset}
                embedded
                variant="dropdown"
              />

              <DesignWorkspaceStatusBar
                size={size}
                side={side}
                maxPrintBounds={currentMaxPrintBounds}
                hasOverflow={hasWorkspaceOverflow}
                violationCount={garmentConstraintViolationCount}
                statusWarning={garmentConstraintStatusWarning}
                printStatus={garmentPrintStatus}
                layers={layers}
                embedded
                compact
              />

              <span className="hidden h-4 w-px shrink-0 bg-zinc-200 lg:inline" aria-hidden />

              <DesignToolbar
                embedded
                isBusy={isBusy}
                readOnly={readOnly}
                warnings={[]}
                onUpload={onUpload}
                onAddText={onAddText}
                onAddShape={onAddShape}
              />

              <span className="hidden h-4 w-px shrink-0 bg-zinc-200 lg:inline" aria-hidden />

              <DesignerAlignmentToolbar
                disabled={isBusy || readOnly || alignableCount === 0}
                onAlign={handleAlign}
              />

              <div className={`ml-auto flex shrink-0 items-center gap-0.5`}>
                <DesignerTooltip content="復原">
                  <button
                    type="button"
                    disabled={historyDisabled || !canUndo}
                    onClick={() => onUndo?.()}
                    className={tb.iconButton}
                    aria-label="復原"
                  >
                    ↶
                  </button>
                </DesignerTooltip>
                <DesignerTooltip content="重做">
                  <button
                    type="button"
                    disabled={historyDisabled || !canRedo}
                    onClick={() => onRedo?.()}
                    className={tb.iconButton}
                    aria-label="重做"
                  >
                    ↷
                  </button>
                </DesignerTooltip>
              </div>
            </div>

            {/* Context Toolbar（選取物件時顯示） */}
            {showContextToolbar && primaryLayer ? (
              <ContextToolbar
                layer={primaryLayer}
                disabled={isBusy || readOnly}
                onTextPatch={(patch) =>
                  onTextStylePatch(primaryLayer.id, patch)
                }
                onImagePatch={(patch) =>
                  onImageStylePatch(primaryLayer.id, patch)
                }
                onShapePatch={(patch) =>
                  onShapeStylePatch(primaryLayer.id, patch)
                }
                onDelete={() => onDeleteLayer(primaryLayer.id)}
                onReplaceImage={onUpload}
              />
            ) : (
              !readOnly && (
                <ContextToolbarEmptyState
                  hasImage={layers.some((item) => item.type === "image")}
                  hasText={layers.some((item) => item.type === "text")}
                  hasShape={layers.some((item) => item.type === "shape")}
                  disabled={isBusy || readOnly}
                  onUpload={onUpload}
                  onAddText={onAddText}
                  onAddShape={onAddShape}
                />
              )
            )}
          </div>

          {warnings.length > 0 && (
            <div className={`mt-2 flex flex-wrap ${ds.space.gap2}`}>
              {warnings.map((w) => (
                <p
                  key={w}
                  className={`rounded bg-amber-50 px-2 py-1 text-amber-800 ${ds.type.helper}`}
                >
                  {w}
                </p>
              ))}
            </div>
          )}
        </div>

        {debugPrintArea && (
          <PlacementPresetCalibrationPanel
            side={side}
            size={size}
            selectedLayer={primaryLayer}
          />
        )}

        <div className={`relative mx-1.5 mb-1.5 flex min-h-0 flex-1 overflow-hidden rounded-xl ${ds.surface.canvasWell}`}>
          <GeometryDebugConsole />
          {UI_VISIBILITY.showCanvasInfoPanel && (
            <CanvasInfoPanel
              layers={layers}
              selectedLayerIds={selectedIds}
              isBusy={isBusy}
              readOnly={readOnly}
              onSelectLayer={onSelectLayer}
              onRenameLayer={onRenameLayer}
              onToggleVisible={onToggleVisible}
              onToggleLocked={onToggleLocked}
              onMoveLayer={onMoveLayer}
              onDuplicateLayer={onDuplicateLayer}
              onDeleteLayer={onDeleteLayer}
              onReorderDrag={onReorderDrag}
            />
          )}

          {primaryLayer &&
          (primaryLayer.type === "image" ||
            primaryLayer.type === "text" ||
            primaryLayer.type === "shape") ? (
            <div className="pointer-events-auto absolute right-3 top-3 z-30 w-56 max-w-[calc(100%-1.5rem)]">
              <ArtworkSizePanel
                layer={primaryLayer}
                disabled={isBusy || readOnly || primaryLayer.locked}
                boostingResolution={isBusy}
                onPatch={(patch) => onArtworkSizePatch(primaryLayer.id, patch)}
                onBoostResolution={
                  primaryLayer.type === "image" && onBoostImageResolution
                    ? () => onBoostImageResolution(primaryLayer.id)
                    : undefined
                }
              />
            </div>
          ) : null}

          <div className="@container relative z-0 flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-3">
            <ShirtContainerFrame
              canvasRoot
              fitRatio={PREVIEW_FIT_RATIO}
              zoom={zoom}
              className="relative z-0 transition-transform duration-200"
              onPointerDown={() => onClearSelection()}
            >
                <DesignerGarmentPresentation side={side}>
                  <ProcessedTemplateImage
                    gender={gender}
                    side={side}
                    src={templateSrc}
                    alt="服飾模板"
                    className="absolute inset-0 z-0 h-full w-full object-contain"
                  />
                  <GeometryRuntimeDebugOverlay side={side} />
                </DesignerGarmentPresentation>
              <div
                data-runtime-safe-area
                className="pointer-events-none absolute z-[9] border-2 border-dashed border-amber-500/90"
                style={safeAreaStyle}
                aria-hidden
                data-geometry-runtime-version={effectiveGeometryVersion}
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
                data-geometry-runtime-version={effectiveGeometryVersion}
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
                const imageMaxResize =
                  layer.type === "image"
                    ? {
                        maxResizeWidth_cm: rasterMaxPrintSize.width_cm,
                        maxResizeHeight_cm: rasterMaxPrintSize.height_cm,
                      }
                    : null;

                return (
                  <PrintAreaLayerItem
                    key={layer.id}
                    layer={layer}
                    isActive={isActive}
                    isPrimary={isPrimary}
                    isEditing={isEditing}
                    interactionLocked={interactionLocked}
                    readOnly={readOnly}
                    designerCoordinateContext={designerCoordinateContext}
                    designerSnapTargetCacheRef={designerSnapTargetCacheRef}
                    printArea={printArea}
                    gridSnapEnabled={gridSnapEnabled}
                    elementSnapDistance={elementSnapDistance}
                    maxResizeWidth_cm={imageMaxResize?.maxResizeWidth_cm}
                    maxResizeHeight_cm={imageMaxResize?.maxResizeHeight_cm}
                    hasPrintAreaOverflow={
                      layerConstraint?.exceedsGarmentPrintArea ?? false
                    }
                    constraintWarningLabel={constraintWarningLabel || null}
                    constraintBadge={constraintBadge}
                    onLayerSelect={handleLayerSelect}
                    onLayerTransform={handleLayerTransform}
                    onLayerResize={handleLayerResize}
                    onLayerDoubleClick={handleLayerDoubleClick}
                    onSnapGuidesChange={handleSnapGuides}
                    onDragTransformFlush={handleDragTransformFlush}
                    onDragTransformCancel={handleDragTransformCancel}
                    onTextPatch={handleTextPatch}
                    finishTextEdit={finishTextEdit}
                  />
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
                      onLayerToolbarScale(primaryLayer.id, 0.9)
                    }
                    onScaleUp={() =>
                      onLayerToolbarScale(primaryLayer.id, 1.1)
                    }
                    onRotationChange={(rotation) =>
                      onLayerRotationChange(primaryLayer.id, rotation)
                    }
                    onRotateLeft90={() => onQuickRotate90(false)}
                    onRotateRight90={() => onQuickRotate90(true)}
                    onDelete={() => onDeleteLayer(primaryLayer.id)}
                    onDragTransformFlush={handleDragTransformFlush}
                    onDragTransformCancel={handleDragTransformCancel}
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

          <div
            className={`pointer-events-auto absolute bottom-2 right-2 z-30 flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white/95 px-1 py-0.5 shadow-sm backdrop-blur-sm ${ds.motion.shadow}`}
            role="toolbar"
            aria-label="畫布縮放"
          >
            <button
              type="button"
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
              className={`flex ${ds.control.sm} items-center justify-center rounded-md text-zinc-700 transition-colors duration-150 ease-out hover:bg-zinc-100 active:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-40 ${ds.type.body}`}
              aria-label="縮小畫布"
            >
              −
            </button>
            <span className={`min-w-[2.5rem] text-center text-zinc-600 ${ds.type.helper}`}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              onClick={() =>
                setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
              }
              className={`flex ${ds.control.sm} items-center justify-center rounded-md text-zinc-700 transition-colors duration-150 ease-out hover:bg-zinc-100 active:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-40 ${ds.type.body}`}
              aria-label="放大畫布"
            >
              +
            </button>
          </div>
        </div>
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

      {showClearConfirm && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 ${ds.space.p4}`}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className={`w-full max-w-sm bg-white ${ds.space.p6} ${ds.radius.card} ${ds.shadow.preview}`}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-labelledby="clear-design-title"
          >
            <h3
              id="clear-design-title"
              className={ds.type.title}
            >
              清除目前面向設計？
            </h3>
            <p className={`mt-2 text-zinc-900 ${ds.type.body}`}>
              將刪除目前模特「{sideLabel}」的所有圖片與文字圖層，其他模板與面向不受影響。
            </p>
            <div className={`mt-4 flex flex-wrap justify-end ${ds.space.gap2}`}>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className={ds.button.secondary}
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
                  className={`border border-red-300 px-4 py-2 text-red-700 hover:bg-red-50 ${ds.radius.button} ${ds.type.body} ${ds.motion.hover}`}
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
                className={`bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500 ${ds.radius.button} ${ds.type.body} ${ds.motion.hover}`}
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
