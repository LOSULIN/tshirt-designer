"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DesignCanvas } from "./DesignCanvas";
import { PlacementPresetSizeProvider } from "./PlacementPresetToolbar";
import { DesignPanel } from "./DesignPanel";
import { LiveDesignStateProvider } from "./LiveDesignStateContext";
import { IconNav } from "./IconNav";
import { withAutoLayerName } from "./layer-auto-name-ui";
import { ClothingBrowseModal } from "./ClothingBrowseModal";
import { ResultPanel } from "./ResultPanel";
import {
  DesignerBottomNav,
  type DesignerMobileNavTab,
} from "./DesignerBottomNav";
import { LayoutBottomSheet } from "./LayoutBottomSheet";
import { LayoutDrawer } from "./LayoutDrawer";
import { ModelPanel } from "./ModelPanel";
import { ArtworkSizeCoordinateProvider, getArtworkDesignerSizeCm } from "./ArtworkSizePanel";
import { clampArtworkSizeCm } from "./ArtworkSizeIntegerInput";
import { UI_VISIBILITY } from "./ui-visibility";
import { ProductPanel } from "./ProductPanel";
import { ds } from "./design-ui";
import { DesignerToast } from "./DesignerToast";
import { buildCurrentGarmentConstraintMap } from "@/lib/current-garment-print-constraint";
import { createDragRafScheduler } from "@/lib/designer/drag-raf-scheduler";
import {
  createWorkspaceSnapCache,
  resolveWorkspaceSnapTargetsForLayer,
  type WorkspaceSnapTargetCache,
} from "@/lib/designer/workspace-snap-cache";
import { countGarmentConstraintViolations } from "@/lib/garment-constraint-ux";
import { getGarmentPrintStatus } from "@/lib/garment-constraint-ux-polish";
import { getLayersForCanvasRender } from "@/lib/layer-system";
import {
  contestFormToApplicantPayload,
  createEmptyContestSubmissionForm,
  type ContestSubmissionFormData,
} from "@/lib/contest-submission";
import { SubmissionSuccessModal } from "@/components/SubmissionSuccessModal";
import { ContestSubmitModal } from "./ContestSubmitModal";
import { SubmitApplicationModal } from "./SubmitApplicationModal";
import { UploadValidationModal } from "./UploadValidationModal";
import type {
  Gender,
  Material,
  ShirtColor,
  Side,
  Size,
  SizeSuggestion,
} from "@/lib/constants";
import {
  DEFAULT_MATERIAL,
  DEFAULT_MODEL_ID,
  DRAFT_TTL_MS,
  getProductName,
  normalizeMaterial,
  normalizeShirtColor,
  PRODUCT_ID,
  suggestSize,
} from "@/lib/constants";
import {
  createDraftStorage,
  type DraftStorage,
} from "@/lib/draft-storage";
import {
  DESIGNER_MODE_DEFAULT,
  type DesignerMode,
} from "@/lib/designer-mode";
import { lockAllLayersInTemplate } from "@/lib/design-lock";
import {
  createEmptyDesignLayersByTemplate,
  DESIGN_GENDERS,
  DESIGN_SIDES,
  getLayersForSlot,
  hasAnyDesign,
  hasDesignInSlot,
  layersByTemplateToDraftSnapshot,
  legacyConfigFromSlot,
  migrateDraftLayersByTemplate,
  setLayersForSlot,
  updateLayersForSlot,
} from "@/lib/design-state";
import {
  buildAllTextsJson,
  buildDesignJson,
  buildFullDesignJson,
} from "@/lib/export-design";
import { renderMockupPreviewPng } from "@/lib/mockup-export";
import {
  appendProofArtifactsToFormData,
  buildProofOrder,
  prepareProofSubmission,
} from "@/lib/proof-engine/client";
import {
  cmToUiPx,
  migrateDesignLayersToCm,
} from "@/lib/design-cm";
import { resolvePrintAreaCm } from "@/lib/coordinate-runtime";
import {
  getExportDimensions,
  migrateLayersFromLegacyCanvasUnits,
} from "@/lib/print-area";
import { DEFAULT_PRINT_MODE } from "@/lib/printArea";
import { getDesignerWorkspacePrintAreaCm } from "@/lib/designer-workspace";
import {
  designerLengthToWorkspaceLength,
  projectLayerPatchToWorkspace,
  workspaceRectToDesignerRect,
} from "@/lib/designer-coordinate-facade";
import {
  applyDesignerLayerAlignment,
  createControllerContext,
  createDesignerAlignmentContext,
  createDesignerAutoFitLayer,
  createDesignerDefaultShapeLayer,
  createDesignerDefaultTextLayer,
  createDesignerDuplicateLayer,
  createDesignerFitContext,
  createDesignerGestureContext,
  createDesignerUploadPlacement,
  fitDesignerLayer,
  hydrateDesignerLayers,
  resolveDesignerGestureResizeWorkspacePatch,
  resolveWorkspaceGestureForApplyClamped,
  updateDesignerLayer,
} from "@/lib/designer-coordinate-controller";
import { applyDesignerPlacementPresetPreserveSize, resolvePhysicalPresetWorkspaceRect } from "@/lib/designer-placement-ux";
import { getLayerEffectiveCmRect } from "@/lib/design-cm";
import {
  analyzeImageArtworkBoundsFromFile,
  getImageArtworkAspectRatio,
} from "@/lib/image-bounds";
import { boostImageLayerResolution } from "@/lib/image-resolution-booster";
import { getTextLayerCmRect } from "@/lib/text-layer";
import {
  applyClampedLayerPatch,
  applyTextFontSizePatch,
  resizeTextLayer,
  scaleLayerFromToolbar,
} from "@/lib/layer-constraints";
import { logRafDragDiagnostic } from "@/lib/designer/drag-snap-diagnostic";
import {
  DEFAULT_ELEMENT_SNAP_UI_VALUE,
  uiElementSnapDistanceToWorkspaceCm,
} from "@/lib/designer/element-snap-threshold";
import { normalizeDesignLayers } from "@/lib/layer-normalize";
import {
  rotateClockwise90,
  rotateCounterClockwise90,
} from "@/lib/layer-rotation";
import {
  getImageFitOptions,
} from "@/lib/image-print-quality";
import {
  getPlacementPresetById,
  type PlacementPresetId,
} from "@/lib/placement-presets";
import {
  canAddImageLayer,
  canAddShapeLayer,
  canAddTextLayer,
  createImageLayer,
  duplicateImageLayerAsync,
  duplicateShapeLayer,
  duplicateTextLayer,
  imageLayerLimitMessage,
  layersToDraftSnapshot,
  moveLayerZIndex,
  reorderLayersByDrag,
  revokeLayerAssets,
  shapeLayerLimitMessage,
  textLayerLimitMessage,
} from "@/lib/layers";
import { buildSnapTargetsFromLayers } from "@/lib/snap-targets";
import {
  createPreviewFromFile,
  isUpscaledBeyondOriginal,
  validateImageFile,
  validateImageFileFull,
} from "@/lib/image-processing";
import type {
  ApplicationFormData,
  DesignLayer,
  ImageDesignLayer,
  PanelTab,
  ShapeDesignLayer,
  ShapeKind,
  TextDesignLayer,
  UploadedDesignImage,
} from "@/lib/types";
import { cloneDesignLayers } from "@/lib/design-history";
import {
  countAlignableLayers,
  type LayerAlignmentAxis,
} from "@/lib/layer-alignment";
import { useDesignHistory } from "@/hooks/useDesignHistory";
import { nanoid } from "nanoid";

async function createPlaceholderPng(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("無法建立佔位圖"));
      else resolve(blob);
    }, "image/png");
  });
}

async function hydrateImageLayer(
  layer: ImageDesignLayer,
  original: Blob,
  preview: Blob,
): Promise<ImageDesignLayer> {
  const originalUrl = URL.createObjectURL(original);
  const previewUrl = URL.createObjectURL(preview);
  const previewImg = new Image();
  const originalImg = new Image();
  await Promise.all([
    new Promise<void>((resolve) => {
      previewImg.onload = () => resolve();
      previewImg.src = previewUrl;
    }),
    new Promise<void>((resolve) => {
      originalImg.onload = () => resolve();
      originalImg.src = originalUrl;
    }),
  ]);

  const artworkBounds =
    layer.image?.artworkBounds ??
    (await analyzeImageArtworkBoundsFromFile(original));

  return {
    ...layer,
    image: {
      originalBlob: original,
      originalUrl,
      previewUrl,
      previewWidth: previewImg.naturalWidth,
      previewHeight: previewImg.naturalHeight,
      naturalWidth: originalImg.naturalWidth,
      naturalHeight: originalImg.naturalHeight,
      imagePixelWidth: originalImg.naturalWidth,
      imagePixelHeight: originalImg.naturalHeight,
      artworkBounds,
      mimeType: original.type,
      fileName: layer.image?.fileName ?? "draft",
    },
  };
}

async function hydrateDesignLayersByTemplate(
  snapshot: ReturnType<typeof layersByTemplateToDraftSnapshot>,
  draftStorage: DraftStorage,
  size = "M",
) {
  let result = createEmptyDesignLayersByTemplate();
  let legacyDraftImagesUsed = false;

  for (const templateGender of DESIGN_GENDERS) {
    for (const templateSide of DESIGN_SIDES) {
      const hydrated: DesignLayer[] = [];

      for (const layer of getLayersForSlot(snapshot, templateGender, templateSide)) {
        if (layer.type === "image") {
          let blobs = await draftStorage.loadLayerImages(layer.id);
          if ((!blobs.original || !blobs.preview) && !legacyDraftImagesUsed) {
            const legacy = await draftStorage.loadDraftImages();
            if (legacy.original && legacy.preview) {
              blobs = legacy;
              legacyDraftImagesUsed = true;
            }
          }
          if (blobs.original && blobs.preview) {
            hydrated.push(
              await hydrateImageLayer(layer, blobs.original, blobs.preview),
            );
          } else {
            hydrated.push(layer);
          }
        } else {
          hydrated.push(layer);
        }
      }

      result = setLayersForSlot(
        result,
        templateGender,
        templateSide,
        hydrateDesignerLayers(
          normalizeDesignLayers(
            migrateDesignLayersToCm(
              migrateLayersFromLegacyCanvasUnits(hydrated),
            ),
          ),
          createDesignerFitContext(templateSide, size),
        ),
      );
    }
  }

  return result;
}

const EMPTY_FORM: ApplicationFormData = {
  applicantName: "",
  applicantEmail: "",
  applicantPhone: "",
  notes: "",
};

const EMPTY_CONTEST_FORM = createEmptyContestSubmissionForm();

type DesignerAppProps = {
  mode?: DesignerMode;
  /** URL ?debugPrintArea=1 或面板開關 */
  initialDebugPrintArea?: boolean;
  /** URL ?printPositionMode=garment */
  initialPreviewPrintPositionMode?: import("@/lib/coordinates/preview-position-mode").PreviewPrintPositionMode;
};

export function DesignerApp({
  mode = DESIGNER_MODE_DEFAULT,
  initialDebugPrintArea = false,
  initialPreviewPrintPositionMode,
}: DesignerAppProps) {
  const isContestMode = mode === "contest";
  const draftStorage = useMemo(() => createDraftStorage(mode), [mode]);
  const [activeTab, setActiveTab] = useState<PanelTab>("product");
  const [gender, setGender] = useState<Gender>("child-male");
  const [side, setSide] = useState<Side>("front");
  const [size, setSize] = useState<Size>("M");
  const [shirtColor, setShirtColor] = useState<ShirtColor>("white");
  const fit = "standard" as const;
  const [material, setMaterial] = useState<Material>(DEFAULT_MATERIAL);
  const [modelId, setModelId] = useState("child-male-1");
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(65);
  const [suggestedSize, setSuggestedSize] = useState<SizeSuggestion>("M");

  const [layersByTemplate, setLayersByTemplate] = useState(
    createEmptyDesignLayersByTemplate,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [cloudSyncWarning, setCloudSyncWarning] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [draftId, setDraftId] = useState(() => nanoid(12));
  const [jpgHintShown, setJpgHintShown] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [debugPrintArea, setDebugPrintArea] = useState(initialDebugPrintArea);
  const [previewPrintPositionMode, setPreviewPrintPositionMode] = useState(
    initialPreviewPrintPositionMode ?? DEFAULT_PRINT_MODE,
  );
  useEffect(() => {
    if (activeTab === "model" || activeTab === "layers") {
      setActiveTab("product");
    }
  }, [activeTab]);
  const [gridSnapEnabled, setGridSnapEnabled] = useState(true);
  const [largePrintModeEnabled, setLargePrintModeEnabled] = useState(false);
  const [elementSnapDistance, setElementSnapDistance] = useState(
    DEFAULT_ELEMENT_SNAP_UI_VALUE,
  );
  const elementSnapThresholdCm = uiElementSnapDistanceToWorkspaceCm(
    elementSnapDistance,
  );
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showClothingBrowse, setShowClothingBrowse] = useState(false);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [mobileNavTab, setMobileNavTab] = useState<DesignerMobileNavTab>("design");
  const [mobileSheet, setMobileSheet] = useState<
    "product" | "preview" | "checkout" | null
  >(null);
  const [showContestSubmitModal, setShowContestSubmitModal] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    submissionNo: string;
    applicantName: string;
  } | null>(null);
  const [uploadAlertDetail, setUploadAlertDetail] = useState<string | null>(
    null,
  );
  const [focusTextEditor, setFocusTextEditor] = useState(false);
  const [pendingTextEditLayerId, setPendingTextEditLayerId] = useState<
    string | null
  >(null);
  const [pendingPlacementPresetId, setPendingPlacementPresetId] =
    useState<PlacementPresetId | null>(null);
  const [isDesignLocked, setIsDesignLocked] = useState(false);
  const [applicationForm, setApplicationForm] =
    useState<ApplicationFormData>(EMPTY_FORM);
  const [contestApplicationForm, setContestApplicationForm] =
    useState<ContestSubmissionFormData>(EMPTY_CONTEST_FORM);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const layers = useMemo(
    () => getLayersForSlot(layersByTemplate, gender, side),
    [layersByTemplate, gender, side],
  );
  const layersRef = useRef(layers);
  layersRef.current = layers;

  const [previewLayers, setPreviewLayers] = useState<DesignLayer[]>(layers);
  const previewLayersDeferredRef = useRef(false);
  const previewPointerUpListenerRef = useRef<(() => void) | null>(null);

  const syncPreviewLayers = useCallback(() => {
    previewLayersDeferredRef.current = false;
    setPreviewLayers(layersRef.current);
    if (previewPointerUpListenerRef.current) {
      window.removeEventListener("pointerup", previewPointerUpListenerRef.current);
      previewPointerUpListenerRef.current = null;
    }
  }, []);

  const beginPreviewLayersDeferral = useCallback(() => {
    previewLayersDeferredRef.current = true;
    if (previewPointerUpListenerRef.current) return;
    const onPointerUp = () => {
      previewPointerUpListenerRef.current = null;
      syncPreviewLayers();
    };
    previewPointerUpListenerRef.current = onPointerUp;
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }, [syncPreviewLayers]);

  useEffect(() => {
    if (!previewLayersDeferredRef.current) {
      setPreviewLayers(layers);
    }
  }, [layers]);

  useEffect(() => {
    return () => {
      if (previewPointerUpListenerRef.current) {
        window.removeEventListener(
          "pointerup",
          previewPointerUpListenerRef.current,
        );
        previewPointerUpListenerRef.current = null;
      }
    };
  }, []);

  const maxPrintBounds = useMemo(
    () => resolvePrintAreaCm({ runtime: "designer", side, size }),
    [side, size],
  );

  const previewPrintStatus = useMemo(() => {
    const visibleLayers = getLayersForCanvasRender(previewLayers).filter(
      (layer) => layer.visible,
    );
    const constraintMap = buildCurrentGarmentConstraintMap(
      visibleLayers,
      side,
      size,
    );
    const violationCount = countGarmentConstraintViolations(
      [...constraintMap.values()].map((state) => ({
        exceedsGarmentPrintArea: state.exceedsGarmentPrintArea,
        violationEdges: state.violationEdges,
      })),
    );
    return getGarmentPrintStatus(violationCount, size, maxPrintBounds);
  }, [previewLayers, side, size, maxPrintBounds]);
  /** 圖層定位／clamp／對齊分母 — 固定 Design Workspace（M） */
  const workspacePrintArea = useMemo(
    () => getDesignerWorkspacePrintAreaCm(side),
    [side],
  );
  /** Step 13.0H：建立／版型置入經 Designer Coordinate Controller */
  const designerCoordinateContext = useMemo(
    () => createControllerContext(side, size),
    [side, size],
  );
  /** Step 13.0J：Gesture Runtime context */
  const designerGestureContext = useMemo(
    () => createDesignerGestureContext(side, size),
    [side, size],
  );
  /** Step 13.0K：Alignment Runtime context */
  const designerAlignmentContext = useMemo(
    () => createDesignerAlignmentContext(side, size),
    [side, size],
  );
  /** Step 13.0M：Auto-Fit / Hydration context */
  const designerFitContext = useMemo(
    () => createDesignerFitContext(side, size),
    [side, size],
  );
  const exportDims = useMemo(() => getExportDimensions(), []);

  const setLayers = useCallback(
    (updater: DesignLayer[] | ((prev: DesignLayer[]) => DesignLayer[])) => {
      setLayersByTemplate((prev) =>
        updateLayersForSlot(prev, gender, side, (current) => {
          return typeof updater === "function" ? updater(current) : updater;
        }),
      );
    },
    [gender, side],
  );

  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const primaryLayer = layers.find((l) => l.id === primaryId) ?? null;
  const hasDesign = hasAnyDesign(layersByTemplate);

  useEffect(() => {
    setSelectedIds([]);
    setFocusTextEditor(false);
    setPendingPlacementPresetId(null);
  }, [gender, side]);

  useEffect(() => {
    if (isContestMode) {
      setShirtColor("white");
    }
  }, [isContestMode]);

  const handleShirtColorChange = useCallback(
    (color: ShirtColor) => {
      if (isContestMode) return;
      setShirtColor(color);
    },
    [isContestMode],
  );

  const submissionMeta = {
    product: getProductName(),
    size,
    shirtColor,
    fit,
    material,
    gender,
    side,
    heightCm,
    weightKg,
    suggestedSize,
    modelId,
  };

  const updateWarnings = useCallback(() => {
    const next: string[] = [];
    if (primaryLayer?.type === "image") {
      const img = primaryLayer.image;
      if (
        isUpscaledBeyondOriginal(
          cmToUiPx(primaryLayer.width_cm),
          cmToUiPx(primaryLayer.height_cm),
          primaryLayer.scale,
          img.naturalWidth,
          img.naturalHeight,
        )
      ) {
        next.push("圖片可能失真，建議使用更高解析度圖片");
      }
      if (!img.mimeType.includes("png") && !jpgHintShown) {
        next.push("建議使用透明背景PNG獲得最佳印刷效果");
      }
    }
    setWarnings(next);
  }, [primaryLayer, jpgHintShown]);

  useEffect(() => {
    updateWarnings();
  }, [updateWarnings]);

  const guardEditable = useCallback(() => {
    if (isDesignLocked || isBusy) return false;
    return true;
  }, [isDesignLocked, isBusy]);

  const restoreLayersFromHistory = useCallback(
    (snapshot: DesignLayer[]) => {
      setLayersByTemplate((prev) =>
        updateLayersForSlot(prev, gender, side, () =>
          cloneDesignLayers(snapshot),
        ),
      );
      setSelectedIds((prev) =>
        prev.filter((id) => snapshot.some((layer) => layer.id === id)),
      );
    },
    [gender, side],
  );

  const {
    prepareDiscreteMutation,
    markGestureMutation,
    prepareTextMutation,
    clearHistory,
    revokeDeletedLayerAssets,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useDesignHistory({
    layers,
    gender,
    side,
    enabled: !isDesignLocked && !isBusy,
    onRestore: restoreLayersFromHistory,
  });

  const handleUndoClick = useCallback(() => {
    if (undo()) {
      setStatusMessage("已完成 Undo");
    }
  }, [undo]);

  const handleRedoClick = useCallback(() => {
    if (redo()) {
      setStatusMessage("已完成 Redo");
    }
  }, [redo]);

  /** 新增圖層時不重新 fit 既有圖層，避免版位被連帶重算 */
  const appendLayers = useCallback(
    (newLayers: DesignLayer | DesignLayer[]) => {
      prepareDiscreteMutation();
      const toAdd = Array.isArray(newLayers) ? newLayers : [newLayers];
      setLayersByTemplate((prev) =>
        updateLayersForSlot(prev, gender, side, (current) => [
          ...current,
          ...toAdd,
        ]),
      );
    },
    [gender, side, prepareDiscreteMutation],
  );

  const updateLayer = useCallback(
    (id: string, patch: Partial<DesignLayer>) => {
      if ("text" in patch && patch.text !== undefined) {
        prepareTextMutation();
      } else {
        prepareDiscreteMutation();
      }
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;
          return updateDesignerLayer(layer, patch, designerFitContext, {
            rasterFit:
              layer.type === "image"
                ? getImageFitOptions(largePrintModeEnabled)
                : undefined,
          });
        }),
      );
    },
    [
      setLayers,
      designerFitContext,
      largePrintModeEnabled,
      prepareDiscreteMutation,
      prepareTextMutation,
    ],
  );

  const applyClampedLayerTransform = useCallback(
    (
      id: string,
      patch: Partial<{
        x_cm: number;
        y_cm: number;
        scale: number;
        rotation: number;
      }>,
    ) => {
      markGestureMutation();
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;
          const layerBefore = { x: layer.x_cm, y: layer.y_cm };
          const visibleLayers = prev.filter((l) => l.visible && !l.locked);
          const otherElements = resolveWorkspaceSnapTargetsForLayer(
            workspaceSnapCacheRef.current,
            id,
            visibleLayers,
          );
          const workspacePatch = resolveWorkspaceGestureForApplyClamped(
            layer,
            patch,
            designerGestureContext,
            {
              gridSnap: gridSnapEnabled,
              elementSnap: true,
              elementSnapThresholdCm: elementSnapThresholdCm,
              otherElements,
            },
          );
          const nextLayer = applyClampedLayerPatch(
            layer,
            workspacePatch,
            workspacePrintArea,
            {
              gridSnap: gridSnapEnabled,
              elementSnapThreshold: elementSnapThresholdCm,
              otherElements,
              rasterFit:
                layer.type === "image"
                  ? getImageFitOptions(largePrintModeEnabled)
                  : undefined,
            },
          );

          if (process.env.NODE_ENV === "development") {
            logRafDragDiagnostic({
              phase: "raf",
              layerId: id,
              patch,
              layerBefore,
              layerAfter: { x: nextLayer.x_cm, y: nextLayer.y_cm },
              workspacePatch,
              workspacePrintArea,
              gridSnapEnabled,
              elementSnapDistanceUi: elementSnapDistance,
              elementSnapThresholdCm,
              otherElements,
              layer,
            });
          }

          return nextLayer;
        }),
      );
    },
    [
      setLayers,
      workspacePrintArea,
      gridSnapEnabled,
      elementSnapThresholdCm,
      largePrintModeEnabled,
      markGestureMutation,
      designerGestureContext,
    ],
  );

  const applyClampedLayerTransformRef = useRef(applyClampedLayerTransform);
  applyClampedLayerTransformRef.current = applyClampedLayerTransform;

  const workspaceSnapCacheRef = useRef<WorkspaceSnapTargetCache | null>(null);

  const beginWorkspaceSnapCacheIfNeeded = useCallback(() => {
    if (!workspaceSnapCacheRef.current) {
      workspaceSnapCacheRef.current = createWorkspaceSnapCache(layersRef.current);
    }
  }, []);

  const clearWorkspaceSnapCache = useCallback(() => {
    workspaceSnapCacheRef.current = null;
  }, []);

  const dragTransformSchedulerRef = useRef(createDragRafScheduler());

  useEffect(() => {
    return () => {
      dragTransformSchedulerRef.current.cancel();
      workspaceSnapCacheRef.current = null;
    };
  }, []);

  const scheduleClampedLayerTransform = useCallback(
    (
      id: string,
      patch: Partial<{
        x_cm: number;
        y_cm: number;
        scale: number;
        rotation: number;
      }>,
    ) => {
      beginPreviewLayersDeferral();
      beginWorkspaceSnapCacheIfNeeded();
      dragTransformSchedulerRef.current.schedule(() => {
        applyClampedLayerTransformRef.current(id, patch);
      });
    },
    [beginPreviewLayersDeferral, beginWorkspaceSnapCacheIfNeeded],
  );

  const flushDragTransformScheduler = useCallback(() => {
    dragTransformSchedulerRef.current.flush();
    clearWorkspaceSnapCache();
    syncPreviewLayers();
  }, [clearWorkspaceSnapCache, syncPreviewLayers]);

  const cancelDragTransformScheduler = useCallback(() => {
    dragTransformSchedulerRef.current.cancel();
    clearWorkspaceSnapCache();
    syncPreviewLayers();
  }, [clearWorkspaceSnapCache, syncPreviewLayers]);

  const rotateLayersQuick90 = useCallback(
    (ids: string[], clockwise: boolean, discreteHistory = false) => {
      if (!guardEditable()) return;
      if (discreteHistory) prepareDiscreteMutation();
      else markGestureMutation();

      setLayers((prev) => {
        const idSet = new Set(
          ids.filter((id) => {
            const layer = prev.find((entry) => entry.id === id);
            return layer && !layer.locked;
          }),
        );
        if (idSet.size === 0) return prev;

        return prev.map((layer) => {
          if (!idSet.has(layer.id)) return layer;
          const nextRotation = clockwise
            ? rotateClockwise90(layer.rotation)
            : rotateCounterClockwise90(layer.rotation);
          const visibleLayers = prev.filter(
            (entry) => entry.visible && !entry.locked,
          );
          const workspacePatch = resolveWorkspaceGestureForApplyClamped(
            layer,
            { rotation: nextRotation },
            designerGestureContext,
          );
          return applyClampedLayerPatch(
            layer,
            workspacePatch,
            workspacePrintArea,
            {
              gridSnap: gridSnapEnabled,
              elementSnapThreshold: elementSnapThresholdCm,
              otherElements: buildSnapTargetsFromLayers(
                layer.id,
                visibleLayers,
              ),
              rasterFit:
                layer.type === "image"
                  ? getImageFitOptions(largePrintModeEnabled)
                  : undefined,
            },
          );
        });
      });
    },
    [
      guardEditable,
      prepareDiscreteMutation,
      markGestureMutation,
      setLayers,
      workspacePrintArea,
      gridSnapEnabled,
      elementSnapThresholdCm,
      largePrintModeEnabled,
      designerGestureContext,
    ],
  );

  const applyLayerResize = useCallback(
    (
      id: string,
      next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
      lockAspect = true,
    ) => {
      beginPreviewLayersDeferral();
      markGestureMutation();
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;

          const workspaceNext = resolveDesignerGestureResizeWorkspacePatch(
            layer,
            next,
            designerGestureContext,
          );
          const fittedNext = {
            x_cm: workspaceNext.x_cm ?? next.x_cm,
            y_cm: workspaceNext.y_cm ?? next.y_cm,
            width_cm: workspaceNext.width_cm ?? next.width_cm,
            height_cm: workspaceNext.height_cm ?? next.height_cm,
          };

          const current =
            layer.type === "text"
              ? getTextLayerCmRect(layer)
              : getLayerEffectiveCmRect(layer);
          const anchorCenterX = current.x_cm + current.width_cm / 2;
          const anchorCenterY = current.y_cm + current.height_cm / 2;

          if (layer.type === "text") {
            const textKeepRatio = layer.keepRatio === false ? lockAspect : true;
            return resizeTextLayer(
              layer,
              fittedNext,
              {
                keepRatio: textKeepRatio,
                anchorCenter: {
                  x_cm: anchorCenterX,
                  y_cm: anchorCenterY,
                },
              },
              workspacePrintArea,
            );
          }

          if (layer.type === "shape") {
            if (lockAspect) {
              const scaleW =
                current.width_cm > 0
                  ? fittedNext.width_cm / current.width_cm
                  : 1;
              const scaleH =
                current.height_cm > 0
                  ? fittedNext.height_cm / current.height_cm
                  : 1;
              const factor =
                Math.abs(scaleW - 1) >= Math.abs(scaleH - 1) ? scaleW : scaleH;
              const width_cm = current.width_cm * factor;
              const height_cm = current.height_cm * factor;
              return {
                ...layer,
                width_cm,
                height_cm,
                scale: 1,
                x_cm: anchorCenterX - width_cm / 2,
                y_cm: anchorCenterY - height_cm / 2,
              };
            }
            return {
              ...layer,
              width_cm: fittedNext.width_cm,
              height_cm: fittedNext.height_cm,
              scale: 1,
              x_cm: anchorCenterX - fittedNext.width_cm / 2,
              y_cm: anchorCenterY - fittedNext.height_cm / 2,
            };
          }

          if (layer.type === "image") {
            if (lockAspect) {
              const factor =
                current.width_cm > 0
                  ? fittedNext.width_cm / current.width_cm
                  : 1;
              return {
                ...layer,
                x_cm: fittedNext.x_cm,
                y_cm: fittedNext.y_cm,
                scale: layer.scale * factor,
              };
            }

            return {
              ...layer,
              width_cm: fittedNext.width_cm,
              height_cm: fittedNext.height_cm,
              scale: 1,
              x_cm: anchorCenterX - fittedNext.width_cm / 2,
              y_cm: anchorCenterY - fittedNext.height_cm / 2,
            };
          }

          return layer;
        }),
      );
    },
    [setLayers, markGestureMutation, designerGestureContext, workspacePrintArea, beginPreviewLayersDeferral],
  );

  const applyLayerToolbarScale = useCallback(
    (id: string, factor: number) => {
      if (!guardEditable()) return;
      if (Math.abs(factor - 1) < 1e-6) return;
      markGestureMutation();
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;
          return scaleLayerFromToolbar(
            layer,
            factor,
            workspacePrintArea,
            layer.type === "image"
              ? { rasterFit: getImageFitOptions(largePrintModeEnabled) }
              : undefined,
          );
        }),
      );
    },
    [
      guardEditable,
      markGestureMutation,
      setLayers,
      workspacePrintArea,
      largePrintModeEnabled,
    ],
  );

  const handleTextInspectorPatch = useCallback(
    (
      id: string,
      patch: {
        text?: string;
        fontSize_cm?: number;
        x_cm?: number;
        y_cm?: number;
        rotation?: number;
      },
    ) => {
      if (!guardEditable()) return;
      if (patch.rotation !== undefined) {
        applyClampedLayerTransform(id, { rotation: patch.rotation });
        return;
      }
      if (patch.x_cm !== undefined || patch.y_cm !== undefined) {
        applyClampedLayerTransform(id, {
          x_cm: patch.x_cm,
          y_cm: patch.y_cm,
        });
        return;
      }
      if (patch.fontSize_cm !== undefined) {
        prepareDiscreteMutation();
        setLayers((prev) =>
          prev.map((layer) => {
            if (layer.id !== id || layer.type !== "text") return layer;
            return applyTextFontSizePatch(
              layer,
              patch.fontSize_cm!,
              workspacePrintArea,
            );
          }),
        );
        return;
      }
      if (patch.text !== undefined) {
        updateLayer(id, { text: patch.text });
      }
    },
    [
      guardEditable,
      updateLayer,
      applyClampedLayerTransform,
      prepareDiscreteMutation,
      setLayers,
      workspacePrintArea,
    ],
  );

  const handleInspectorImageTransform = useCallback(
    (
      id: string,
      patch: { x_cm?: number; y_cm?: number; scale?: number; rotation?: number },
    ) => {
      if (!guardEditable()) return;
      applyClampedLayerTransform(id, patch);
    },
    [guardEditable, applyClampedLayerTransform],
  );

  const handleInspectorImageResize = useCallback(
    (
      id: string,
      next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
      lockAspect = true,
    ) => {
      if (!guardEditable()) return;
      applyLayerResize(id, next, lockAspect);
    },
    [guardEditable, applyLayerResize],
  );

  const handleArtworkSizePatch = useCallback(
    (id: string, patch: { width_cm?: number; height_cm?: number }) => {
      if (!guardEditable()) return;
      if (patch.width_cm === undefined && patch.height_cm === undefined) return;
      prepareDiscreteMutation();
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;
          if (
            layer.type !== "image" &&
            layer.type !== "text" &&
            layer.type !== "shape"
          ) {
            return layer;
          }

          if (layer.type === "image") {
            const currentEffective = getLayerEffectiveCmRect(layer);
            const anchorCenter = {
              x_cm: currentEffective.x_cm + currentEffective.width_cm / 2,
              y_cm: currentEffective.y_cm + currentEffective.height_cm / 2,
            };
            const currentDesigner = workspaceRectToDesignerRect(
              currentEffective,
              designerCoordinateContext,
            );
            const aspect = getImageArtworkAspectRatio(layer.image);
            let designerWidth =
              patch.width_cm ?? currentDesigner.width_cm;
            let designerHeight =
              patch.height_cm ?? currentDesigner.height_cm;

            if (patch.width_cm !== undefined && patch.height_cm === undefined) {
              designerHeight = designerWidth / aspect;
            } else if (
              patch.height_cm !== undefined &&
              patch.width_cm === undefined
            ) {
              designerWidth = designerHeight * aspect;
            }

            designerWidth = clampArtworkSizeCm(designerWidth);
            designerHeight = clampArtworkSizeCm(designerHeight);

            const width_cm = designerLengthToWorkspaceLength(
              designerWidth,
              designerCoordinateContext,
              "x",
            );
            const height_cm = designerLengthToWorkspaceLength(
              designerHeight,
              designerCoordinateContext,
              "y",
            );

            return {
              ...layer,
              width_cm,
              height_cm,
              scale: 1,
              x_cm: anchorCenter.x_cm - width_cm / 2,
              y_cm: anchorCenter.y_cm - height_cm / 2,
              keepRatio: true,
            };
          }

          const workspacePatch = projectLayerPatchToWorkspace(
            patch,
            designerCoordinateContext,
          );
          return {
            ...layer,
            ...(workspacePatch.width_cm !== undefined
              ? { width_cm: workspacePatch.width_cm }
              : {}),
            ...(workspacePatch.height_cm !== undefined
              ? { height_cm: workspacePatch.height_cm }
              : {}),
            ...(layer.type === "text"
              ? { keepRatio: false as const }
              : {}),
          };
        }),
      );
    },
    [
      guardEditable,
      prepareDiscreteMutation,
      setLayers,
      designerCoordinateContext,
    ],
  );

  const handleInspectorRotation = useCallback(
    (id: string, rotation: number) => {
      if (!guardEditable()) return;
      applyClampedLayerTransform(id, { rotation });
    },
    [guardEditable, applyClampedLayerTransform],
  );

  const handleSelectLayer = useCallback((id: string, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      if (shiftKey) {
        return prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
      }
      return [id];
    });
  }, []);

  const deleteLayerById = useCallback(
    (id: string) => {
      if (!guardEditable()) return;
      const target = layers.find((layer) => layer.id === id);
      prepareDiscreteMutation();
      setLayersByTemplate((prev) => {
        const current = getLayersForSlot(prev, gender, side);
        const layerToDelete = current.find((layer) => layer.id === id);
        const nextLayers = current.filter((layer) => layer.id !== id);
        if (layerToDelete) {
          revokeDeletedLayerAssets(layerToDelete, nextLayers);
        }
        const next = updateLayersForSlot(prev, gender, side, () => nextLayers);
        if (!hasAnyDesign(next)) {
          setWarnings([]);
          setJpgHintShown(false);
          void draftStorage.clearAllDrafts();
        }
        return next;
      });
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      if (target?.type === "image") {
        setStatusMessage("已刪除圖片");
      } else if (target?.type === "text") {
        setStatusMessage("已刪除文字");
      } else {
        setStatusMessage("已刪除圖層");
      }
    },
    [
      draftStorage,
      gender,
      side,
      guardEditable,
      layers,
      prepareDiscreteMutation,
      revokeDeletedLayerAssets,
    ],
  );

  const restoreDraft = useCallback(async () => {
    const meta = draftStorage.loadDraftMetadata();
    if (!meta) return;

    setDraftId(meta.id);

    let legacyImage: UploadedDesignImage | null = null;
    if (!meta.layersByTemplate && !meta.layers?.length) {
      const images = await draftStorage.loadDraftImages();
      if (images.original && images.preview) {
        const originalUrl = URL.createObjectURL(images.original);
        const previewUrl = URL.createObjectURL(images.preview);
        const previewImg = new Image();
        const originalImg = new Image();
        await Promise.all([
          new Promise<void>((resolve) => {
            previewImg.onload = () => resolve();
            previewImg.src = previewUrl;
          }),
          new Promise<void>((resolve) => {
            originalImg.onload = () => resolve();
            originalImg.src = originalUrl;
          }),
        ]);
        legacyImage = {
          originalBlob: images.original,
          originalUrl,
          previewUrl,
          previewWidth: previewImg.naturalWidth,
          previewHeight: previewImg.naturalHeight,
          naturalWidth: originalImg.naturalWidth,
          naturalHeight: originalImg.naturalHeight,
          mimeType: images.original.type,
          fileName: "draft",
        };
      }
    }

    const { state: snapshot, gender: restoredGender, side: restoredSide } =
      migrateDraftLayersByTemplate(meta, {
        image: legacyImage,
        textLayers: meta.textLayers ?? [],
      });

    setGender(restoredGender);
    setSide(restoredSide);
    if (meta.shirtColor) {
      setShirtColor(normalizeShirtColor(meta.shirtColor));
    }

    const hydrated = await hydrateDesignLayersByTemplate(
      layersByTemplateToDraftSnapshot(snapshot),
      draftStorage,
    );

    if (hasAnyDesign(hydrated)) {
      setLayersByTemplate(hydrated);
      clearHistory();
      setStatusMessage("已恢復未送出的暫存設計");
    }
  }, [draftStorage, clearHistory]);

  useEffect(() => {
    void restoreDraft();
  }, [restoreDraft]);

  const persistDraftLocally = useCallback(async () => {
    if (!hasDesign) return;

    const expiresAt = new Date(Date.now() + DRAFT_TTL_MS).toISOString();
    const activeConfig = legacyConfigFromSlot(layersByTemplate, gender, side);
    const firstImage = layers.find((l) => l.type === "image");

    draftStorage.saveDraftMetadata({
      id: draftId,
      savedAt: new Date().toISOString(),
      expiresAt,
      submitted: false,
      shirtColor,
      activeGender: gender,
      activeSide: side,
      config: activeConfig,
      hasImage: !!firstImage,
      layersByTemplate: layersByTemplateToDraftSnapshot(layersByTemplate),
      layers: layersToDraftSnapshot(layers),
    });

    await draftStorage.saveAllLayerImagesFromState(layersByTemplate);
  }, [
    draftId,
    draftStorage,
    gender,
    side,
    shirtColor,
    hasDesign,
    layers,
    layersByTemplate,
  ]);

  const syncDraftToServer = useCallback(async (): Promise<
    { ok: true } | { ok: false; error: string }
  > => {
    if (!hasDesign) return { ok: true };

    try {
      const formData = new FormData();
      formData.append("draftId", draftId);
      formData.append(
        "designJson",
        buildFullDesignJson(layersByTemplate, gender, side, submissionMeta),
      );
      formData.append("textJson", buildAllTextsJson(layersByTemplate));
      const firstImage = layers.find(
        (l): l is ImageDesignLayer => l.type === "image",
      );
      if (firstImage) {
        formData.append(
          "original",
          firstImage.image.originalBlob,
          firstImage.image.fileName,
        );
        const previewBlob = await fetch(firstImage.image.previewUrl).then((r) =>
          r.blob(),
        );
        formData.append("preview", previewBlob, "preview.png");
      }

      const res = await fetch("/api/designs/draft", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        return {
          ok: false,
          error: data.error ?? `雲端同步失敗（HTTP ${res.status}）`,
        };
      }

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "無法連線至雲端，請檢查網路或 Supabase 設定",
      };
    }
  }, [draftId, gender, side, hasDesign, layers, layersByTemplate, submissionMeta]);

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      void (async () => {
        await persistDraftLocally();
        const result = await syncDraftToServer();
        setCloudSyncWarning(result.ok ? null : result.error);
      })();
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [persistDraftLocally, syncDraftToServer]);

  const showUploadError = useCallback((detail: string) => {
    setUploadAlertDetail(detail);
    setWarnings([]);
  }, []);

  const handleBoostImageResolution = useCallback(
    async (id: string) => {
      if (!guardEditable()) return;
      const layer = layers.find((l) => l.id === id);
      if (!layer || layer.type !== "image") return;

      prepareDiscreteMutation();
      setIsBusy(true);
      try {
        const designerSize = getArtworkDesignerSizeCm(
          layer,
          designerCoordinateContext,
        );
        const updated = await boostImageLayerResolution(layer, undefined, {
          width_cm: designerSize.width_cm,
          height_cm: designerSize.height_cm,
        });
        if (updated === layer) return;
        revokeLayerAssets(layer);
        setLayers((prev) => prev.map((l) => (l.id === id ? updated : l)));
        setStatusMessage("圖片已完成最佳化");
      } catch (error) {
        showUploadError(
          error instanceof Error ? error.message : "無法最佳化圖片",
        );
      } finally {
        setIsBusy(false);
      }
    },
    [guardEditable, layers, prepareDiscreteMutation, setLayers, showUploadError, designerCoordinateContext],
  );

  const handleUpload = async (file: File) => {
    if (!guardEditable()) return;
    setStatusMessage(null);
    if (!canAddImageLayer(layers)) {
      showUploadError(imageLayerLimitMessage());
      return;
    }

    const basic = validateImageFile(file);
    if (!basic.ok) {
      showUploadError(basic.error);
      return;
    }

    setIsBusy(true);
    try {
      const full = await validateImageFileFull(file);
      if (!full.ok) {
        showUploadError(full.error);
        return;
      }

      const [preview, artworkBounds] = await Promise.all([
        createPreviewFromFile(file),
        analyzeImageArtworkBoundsFromFile(file),
      ]);
      const pendingPreset = pendingPlacementPresetId
        ? getPlacementPresetById(pendingPlacementPresetId, size)
        : null;
      const presetActive =
        pendingPreset != null && pendingPreset.sides.includes(side);

      let placement: {
        x_cm: number;
        y_cm: number;
        width_cm: number;
        height_cm: number;
      };
      if (presetActive) {
        placement = resolvePhysicalPresetWorkspaceRect(
          pendingPreset,
          designerCoordinateContext,
        );
      } else {
        placement = createDesignerUploadPlacement(
          artworkBounds.visibleWidth,
          artworkBounds.visibleHeight,
          layers.length,
          designerCoordinateContext,
        );
      }

      const originalUrl = URL.createObjectURL(file);
      const uploaded: UploadedDesignImage = {
        originalBlob: file,
        originalUrl,
        previewUrl: preview.previewUrl,
        previewWidth: preview.previewWidth,
        previewHeight: preview.previewHeight,
        naturalWidth: preview.naturalWidth,
        naturalHeight: preview.naturalHeight,
        imagePixelWidth: preview.naturalWidth,
        imagePixelHeight: preview.naturalHeight,
        artworkBounds,
        mimeType: file.type,
        fileName: file.name,
      };

      const createdLayer = createImageLayer(layers, uploaded, placement);
      const newLayer = withAutoLayerName(
        presetActive
          ? (applyDesignerPlacementPresetPreserveSize(
              createdLayer,
              pendingPreset,
              designerCoordinateContext,
            ) as ImageDesignLayer)
          : createDesignerAutoFitLayer(createdLayer, designerCoordinateContext, {
              rasterFit: getImageFitOptions(largePrintModeEnabled),
            }),
        layers,
      );
      appendLayers(newLayer);
      setSelectedIds([newLayer.id]);
      const msgs: string[] = [];
      if (full.belowRecommended) {
        msgs.push(
          `建議使用 ${exportDims.width}×${exportDims.height} 以獲得最佳印刷效果`,
        );
      }
      if (!full.isPng) {
        setJpgHintShown(true);
        msgs.push("建議使用透明背景PNG獲得最佳印刷效果");
      }
      setWarnings(msgs);
      setStatusMessage(
        presetActive
          ? `圖片新增完成 · 已套用版型 ${pendingPreset.label}`
          : "圖片新增完成",
      );
    } catch (error) {
      showUploadError(
        error instanceof Error ? error.message : "圖片無法讀取",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleClearCurrentSlotDesign = useCallback(() => {
    clearHistory();
    setLayersByTemplate((prev) => {
      for (const layer of getLayersForSlot(prev, gender, side)) {
        revokeLayerAssets(layer);
        void draftStorage.clearLayerImages(layer.id);
      }
      const next = setLayersForSlot(prev, gender, side, []);
      if (!hasAnyDesign(next)) {
        void draftStorage.clearAllDrafts();
        setDraftId(nanoid(12));
      }
      return next;
    });
    setSelectedIds([]);
    setWarnings([]);
    setJpgHintShown(false);
    setFocusTextEditor(false);
    setPendingTextEditLayerId(null);
    setIsDesignLocked(false);
    setStatusMessage("已清除目前面向設計");
  }, [draftStorage, gender, side, clearHistory]);

  const handleClearAllDesign = useCallback(() => {
    clearHistory();
    for (const templateGender of DESIGN_GENDERS) {
      for (const templateSide of DESIGN_SIDES) {
        for (const layer of getLayersForSlot(
          layersByTemplate,
          templateGender,
          templateSide,
        )) {
          revokeLayerAssets(layer);
          void draftStorage.clearLayerImages(layer.id);
        }
      }
    }
    setLayersByTemplate(createEmptyDesignLayersByTemplate());
    setSelectedIds([]);
    setWarnings([]);
    setJpgHintShown(false);
    setFocusTextEditor(false);
    setPendingTextEditLayerId(null);
    setIsDesignLocked(false);
    void draftStorage.clearAllDrafts();
    setDraftId(nanoid(12));
    setStatusMessage("已清除全部設計，可重新開始");
  }, [draftStorage, layersByTemplate, clearHistory]);

  const handleAddText = () => {
    if (!guardEditable()) return;
    if (!canAddTextLayer(layers)) {
      setWarnings([textLayerLimitMessage()]);
      return;
    }

    const pendingPreset = pendingPlacementPresetId
      ? getPlacementPresetById(pendingPlacementPresetId, size)
      : null;
    const presetActive =
      pendingPreset != null && pendingPreset.sides.includes(side);

    const created = presetActive
      ? (applyDesignerPlacementPresetPreserveSize(
          createDesignerDefaultTextLayer(layers, designerCoordinateContext),
          pendingPreset,
          designerCoordinateContext,
        ) as TextDesignLayer)
      : createDesignerDefaultTextLayer(layers, designerCoordinateContext);
    const layer = withAutoLayerName(
      { ...created, text: "雙擊輸入文字" },
      layers,
    );
    appendLayers(layer);
    setSelectedIds([layer.id]);
    setPendingTextEditLayerId(layer.id);
    setStatusMessage(
      presetActive
        ? `文字新增完成 · 已套用版型 ${pendingPreset.label}`
        : "文字新增完成",
    );
  };

  const handleAddShape = (kind: ShapeKind) => {
    if (!guardEditable()) return;
    if (!canAddShapeLayer(layers)) {
      setWarnings([shapeLayerLimitMessage()]);
      return;
    }

    const pendingPreset = pendingPlacementPresetId
      ? getPlacementPresetById(pendingPlacementPresetId, size)
      : null;
    const presetActive =
      pendingPreset != null && pendingPreset.sides.includes(side);

    const createdShape = createDesignerDefaultShapeLayer(
      kind,
      layers,
      designerCoordinateContext,
    );
    const layer = withAutoLayerName(
      presetActive
        ? (applyDesignerPlacementPresetPreserveSize(
            createdShape,
            pendingPreset,
            designerCoordinateContext,
          ) as ShapeDesignLayer)
        : createdShape,
      layers,
    );
    appendLayers(layer);
    setSelectedIds([layer.id]);
    setStatusMessage(
      presetActive
        ? `已新增${layer.name}並套用版型 ${pendingPreset.label}（${pendingPreset.width_cm}×${pendingPreset.height_cm} cm）`
        : `已新增${layer.name}`,
    );
  };

  const handleTextStylePatch = useCallback(
    (id: string, patch: Partial<TextDesignLayer>) => {
      if (!guardEditable()) return;
      if (patch.fontSize_cm !== undefined) {
        const { fontSize_cm, scale: _scale, ...rest } = patch;
        prepareDiscreteMutation();
        setLayers((prev) =>
          prev.map((layer) => {
            if (layer.id !== id || layer.type !== "text") return layer;
            let next = applyTextFontSizePatch(
              layer,
              fontSize_cm,
              workspacePrintArea,
            );
            if (Object.keys(rest).length > 0) {
              next = updateDesignerLayer(
                next,
                rest,
                designerFitContext,
              ) as TextDesignLayer;
            }
            return next;
          }),
        );
        return;
      }
      updateLayer(id, patch);
    },
    [
      guardEditable,
      updateLayer,
      prepareDiscreteMutation,
      setLayers,
      workspacePrintArea,
      designerFitContext,
    ],
  );

  const handleImageStylePatch = useCallback(
    (id: string, patch: Partial<ImageDesignLayer>) => {
      if (!guardEditable()) return;
      if (patch.rotation !== undefined) {
        applyClampedLayerTransform(id, { rotation: patch.rotation });
        return;
      }
      updateLayer(id, patch);
    },
    [guardEditable, updateLayer, applyClampedLayerTransform],
  );

  const handleShapeStylePatch = useCallback(
    (id: string, patch: Partial<ShapeDesignLayer>) => {
      if (!guardEditable()) return;
      if (patch.rotation !== undefined) {
        applyClampedLayerTransform(id, { rotation: patch.rotation });
        return;
      }
      updateLayer(id, patch);
    },
    [guardEditable, updateLayer, applyClampedLayerTransform],
  );

  const handleAlignLayers = useCallback(
    (axis: LayerAlignmentAxis) => {
      if (!guardEditable()) return;
      if (countAlignableLayers(layers, selectedIds) === 0) return;
      prepareDiscreteMutation();
      setLayers((prev) =>
        applyDesignerLayerAlignment(
          prev,
          selectedIds,
          axis,
          designerAlignmentContext,
        ),
      );
    },
    [
      guardEditable,
      layers,
      selectedIds,
      prepareDiscreteMutation,
      setLayers,
      designerAlignmentContext,
    ],
  );

  const handleFitToPrintableArea = useCallback(
    (id: string) => {
      if (!guardEditable()) return;
      prepareDiscreteMutation();
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id || layer.locked) return layer;
          return fitDesignerLayer(layer, designerFitContext, {
            rasterFit:
              layer.type === "image"
                ? getImageFitOptions(largePrintModeEnabled)
                : undefined,
          });
        }),
      );
      setStatusMessage("已將圖層縮放至目前可印範圍內");
    },
    [
      guardEditable,
      prepareDiscreteMutation,
      setLayers,
      designerFitContext,
      largePrintModeEnabled,
    ],
  );

  const handleApplyPlacementPreset = useCallback(
    (presetId: PlacementPresetId) => {
      if (!guardEditable()) return;
      const preset = getPlacementPresetById(presetId, size);
      if (!preset || !preset.sides.includes(side)) return;

      setPendingPlacementPresetId(presetId);

      const targetIds = selectedIds.filter((id) => {
        const layer = layers.find((entry) => entry.id === id);
        return layer && !layer.locked;
      });
      if (targetIds.length === 0) {
        setStatusMessage(
          `已選擇版型：${preset.label}（${preset.width_cm}×${preset.height_cm} cm），上傳或新增物件將套用此尺寸`,
        );
        return;
      }

      prepareDiscreteMutation();
      const idSet = new Set(targetIds);
      setLayers((prev) =>
        prev.map((layer) => {
          if (!idSet.has(layer.id)) return layer;
          return applyDesignerPlacementPresetPreserveSize(
            layer,
            preset,
            designerCoordinateContext,
          );
        }),
      );
      setStatusMessage(
        `已套用版型：${preset.label}（${preset.width_cm}×${preset.height_cm} cm）`,
      );
    },
    [
      guardEditable,
      side,
      size,
      selectedIds,
      layers,
      prepareDiscreteMutation,
      setLayers,
      largePrintModeEnabled,
      designerCoordinateContext,
    ],
  );

  const handleLargePrintModeChange = useCallback(
    (enabled: boolean) => {
      if (!guardEditable()) return;
      prepareDiscreteMutation();
      setLargePrintModeEnabled(enabled);
    },
    [guardEditable, prepareDiscreteMutation],
  );

  const handleDuplicate = async (id: string) => {
    const source = layers.find((l) => l.id === id);
    if (!source) return;

    if (source.type === "image") {
      const dup = await duplicateImageLayerAsync(layers, id);
      if (dup && dup.type === "image") {
        const fitted = createDesignerDuplicateLayer(dup, designerCoordinateContext, {
          rasterFit: getImageFitOptions(largePrintModeEnabled),
        });
        appendLayers(fitted);
        setSelectedIds([fitted.id]);
      }
    } else if (source.type === "shape") {
      const dup = duplicateShapeLayer(layers, id);
      if (dup) {
        const fitted = createDesignerDuplicateLayer(dup, designerCoordinateContext);
        appendLayers(fitted);
        setSelectedIds([fitted.id]);
      }
    } else {
      const dup = duplicateTextLayer(layers, id);
      if (dup) {
        const fitted = createDesignerDuplicateLayer(dup, designerCoordinateContext);
        appendLayers(fitted);
        setSelectedIds([fitted.id]);
      }
    }
    setStatusMessage("已複製圖層");
  };

  const handleSubmitRequest = () => {
    if (!hasDesign) return;
    if (isContestMode) {
      setShowContestSubmitModal(true);
      return;
    }
    setShowSubmitModal(true);
  };

  const handleSubmitConfirm = async () => {
    setIsBusy(true);
    setStatusMessage(null);
    try {
      if (isContestMode) {
        const applicantPayload = contestFormToApplicantPayload(contestApplicationForm);
        const contestMeta = {
          ...submissionMeta,
          applicant: applicantPayload,
        };
        const formData = new FormData();
        formData.append("contestFormJson", JSON.stringify(contestApplicationForm));
        formData.append("productType", PRODUCT_ID);
        formData.append("templateType", gender);
        formData.append("side", side);

        let hasSideDesign = false;

        for (const templateSide of DESIGN_SIDES) {
          if (!hasDesignInSlot(layersByTemplate, gender, templateSide)) {
            continue;
          }

          hasSideDesign = true;
          const slotLayers = getLayersForSlot(
            layersByTemplate,
            gender,
            templateSide,
          );
          const sideJson = buildDesignJson(
            gender,
            templateSide,
            slotLayers,
            contestMeta,
          );
          const previewBlob = await renderMockupPreviewPng({
            shirtColor,
            side: templateSide,
            layers: slotLayers,
            size,
          });

          if (templateSide === "front") {
            formData.append("frontDesignJson", sideJson);
            formData.append("previewFront", previewBlob, "preview-front.png");
          } else {
            formData.append("backDesignJson", sideJson);
            formData.append("previewBack", previewBlob, "preview-back.png");
          }
        }

        if (!hasSideDesign) {
          throw new Error("沒有可送出的設計內容");
        }

        const res = await fetch("/api/contest/submit", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json()) as {
          submissionNo?: string;
          authorName?: string;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "投稿送出失敗");
        }

        if (!data.submissionNo) {
          throw new Error("投稿送出失敗");
        }

        draftStorage.saveDraftMetadata({
          id: draftId,
          savedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + DRAFT_TTL_MS).toISOString(),
          submitted: true,
          activeGender: gender,
          activeSide: side,
          config: legacyConfigFromSlot(layersByTemplate, gender, side),
          hasImage: layers.some((layer) => layer.type === "image"),
          layersByTemplate: layersByTemplateToDraftSnapshot(layersByTemplate),
          layers: layersToDraftSnapshot(layers),
        });

        const authorName =
          data.authorName ?? contestApplicationForm.authorName.trim();

        setShowContestSubmitModal(false);
        setContestApplicationForm(EMPTY_CONTEST_FORM);
        setCloudSyncWarning(null);
        setLayersByTemplate((prev) => lockAllLayersInTemplate(prev));
        setIsDesignLocked(true);
        setPendingTextEditLayerId(null);
        setSubmissionSuccess({
          submissionNo: data.submissionNo,
          applicantName: authorName,
        });
        setDraftId(nanoid(12));
        return;
      }

      const applicantPayload = applicationForm;

      const designJson = buildFullDesignJson(layersByTemplate, gender, side, {
        ...submissionMeta,
        applicant: applicantPayload,
      });
      const textJson = buildAllTextsJson(layersByTemplate);

      const proofOrder = buildProofOrder({
        orderId: draftId,
        gender,
        activeSide: side,
        shirtColor,
        size,
        layersByTemplate,
        applicant: applicantPayload,
        designMeta: submissionMeta,
      });

      setStatusMessage("正在產生設計預覽檔…");
      const proofArtifacts = await prepareProofSubmission(proofOrder);

      setStatusMessage("正在上傳申請…");

      const formData = new FormData();
      appendProofArtifactsToFormData(formData, proofArtifacts);
      formData.append("designJson", designJson);
      formData.append("textJson", textJson);
      formData.append("applicantJson", JSON.stringify(applicantPayload));

      let firstImage: ImageDesignLayer | undefined;
      for (const templateGender of DESIGN_GENDERS) {
        for (const templateSide of DESIGN_SIDES) {
          const image = getLayersForSlot(
            layersByTemplate,
            templateGender,
            templateSide,
          ).find((l): l is ImageDesignLayer => l.type === "image");
          if (image) {
            firstImage = image;
            break;
          }
        }
        if (firstImage) break;
      }

      if (firstImage) {
        formData.append(
          "original",
          firstImage.image.originalBlob,
          firstImage.image.fileName,
        );
      } else {
        formData.append("original", await createPlaceholderPng(), "placeholder.png");
      }

      const res = await fetch("/api/designs/submit", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as {
        submissionNo?: string;
        error?: string;
        email?: { sent: boolean; message?: string };
      };

      if (!res.ok) {
        throw new Error(data.error ?? "送出失敗");
      }

      if (!data.submissionNo) {
        throw new Error("送出失敗");
      }

      const applicantName = applicationForm.applicantName.trim();

      draftStorage.saveDraftMetadata({
        id: draftId,
        savedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + DRAFT_TTL_MS).toISOString(),
        submitted: true,
        activeGender: gender,
        activeSide: side,
        config: legacyConfigFromSlot(layersByTemplate, gender, side),
        hasImage: !!firstImage,
        layersByTemplate: layersByTemplateToDraftSnapshot(layersByTemplate),
        layers: layersToDraftSnapshot(layers),
      });

      setShowSubmitModal(false);
      setShowContestSubmitModal(false);
      setApplicationForm(EMPTY_FORM);
      setContestApplicationForm(EMPTY_CONTEST_FORM);
      setCloudSyncWarning(null);
      setLayersByTemplate((prev) => lockAllLayersInTemplate(prev));
      setIsDesignLocked(true);
      setPendingTextEditLayerId(null);
      setSubmissionSuccess({
        submissionNo: data.submissionNo,
        applicantName,
      });
      setDraftId(nanoid(12));
    } catch (error) {
      setWarnings([
        error instanceof Error ? error.message : "送出設計失敗",
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  const handleGenderChange = (g: Gender) => {
    setGender(g);
    setModelId(DEFAULT_MODEL_ID[g]);
  };

  const handleUpdateBody = () => {
    setSuggestedSize(suggestSize(heightCm, weightKg));
  };

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const tabletQuery = window.matchMedia("(min-width: 768px)");
    const handleViewportChange = () => {
      if (desktopQuery.matches) {
        setLeftDrawerOpen(false);
        setRightDrawerOpen(false);
        setMobileSheet(null);
        return;
      }
      if (tabletQuery.matches) {
        setMobileSheet(null);
        setMobileNavTab("design");
      }
    };
    desktopQuery.addEventListener("change", handleViewportChange);
    tabletQuery.addEventListener("change", handleViewportChange);
    return () => {
      desktopQuery.removeEventListener("change", handleViewportChange);
      tabletQuery.removeEventListener("change", handleViewportChange);
    };
  }, []);

  const handleMobileNavChange = (tab: DesignerMobileNavTab) => {
    setMobileNavTab(tab);
    if (tab === "design") {
      setMobileSheet(null);
      return;
    }
    if (tab === "product") {
      setMobileSheet("product");
      return;
    }
    if (tab === "preview") {
      setMobileSheet("preview");
      return;
    }
    setMobileSheet("checkout");
  };

  const closeMobileSheet = () => {
    setMobileSheet(null);
    setMobileNavTab("design");
  };

  const productPanelNode = (
    <ProductPanel
      shirtColor={shirtColor}
      material={material}
      size={size}
      heightCm={heightCm}
      weightKg={weightKg}
      suggestedSize={suggestedSize}
      isBusy={isBusy}
      designLocked={isDesignLocked}
      onColorChange={handleShirtColorChange}
      onMaterialChange={setMaterial}
      onSizeChange={setSize}
      onHeightChange={setHeightCm}
      onWeightChange={setWeightKg}
      onUpdateBody={handleUpdateBody}
      hideColorPicker={isContestMode}
    />
  );

  const resultPanelNode = (
    <ResultPanel
      gender={gender}
      side={side}
      shirtColor={shirtColor}
      size={size}
      previewLayers={previewLayers}
      printStatus={previewPrintStatus}
      printBounds={maxPrintBounds}
      previewPrintPositionMode={previewPrintPositionMode}
      isBusy={isBusy}
      hasDesign={hasDesign}
      designLocked={isDesignLocked}
      onExpand={() => {
        setShowClothingBrowse(true);
        closeMobileSheet();
      }}
      onSubmit={handleSubmitRequest}
      submitLabel={isContestMode ? "確認投稿" : "確認送出"}
    />
  );

  const mobilePreviewPanelNode = (
    <ResultPanel
      gender={gender}
      side={side}
      shirtColor={shirtColor}
      size={size}
      previewLayers={previewLayers}
      printStatus={previewPrintStatus}
      printBounds={maxPrintBounds}
      previewPrintPositionMode={previewPrintPositionMode}
      isBusy={isBusy}
      hasDesign={hasDesign}
      designLocked={isDesignLocked}
      onExpand={() => {
        setShowClothingBrowse(true);
        closeMobileSheet();
      }}
      onSubmit={handleSubmitRequest}
      submitLabel={isContestMode ? "確認投稿" : "確認送出"}
      sections={["preview", "print"]}
    />
  );

  const mobileCheckoutPanelNode = (
    <ResultPanel
      gender={gender}
      side={side}
      shirtColor={shirtColor}
      size={size}
      previewLayers={previewLayers}
      printStatus={previewPrintStatus}
      printBounds={maxPrintBounds}
      previewPrintPositionMode={previewPrintPositionMode}
      isBusy={isBusy}
      hasDesign={hasDesign}
      designLocked={isDesignLocked}
      onExpand={() => {
        setShowClothingBrowse(true);
        closeMobileSheet();
      }}
      onSubmit={handleSubmitRequest}
      submitLabel={isContestMode ? "確認投稿" : "確認送出"}
      sections={["print", "cta"]}
    />
  );

  const panelHostClassName =
    "[&_[data-drawer-panel]]:w-full [&_[data-drawer-panel]]:max-w-none [&_[data-drawer-panel]]:shrink-0 [&_[data-drawer-panel]]:border-0 [&_[data-layout-rail]]:w-full [&_[data-layout-rail]]:max-w-none [&_[data-layout-rail]]:border-0";

  const garmentInfoPanel = UI_VISIBILITY.showModelPanel ? (
    <ModelPanel
      gender={gender}
      heightCm={heightCm}
      weightKg={weightKg}
      suggestedSize={suggestedSize}
      isBusy={isBusy}
      hasDesign={hasDesign}
      onGenderChange={handleGenderChange}
      onHeightChange={setHeightCm}
      onWeightChange={setWeightKg}
      onUpdateBody={handleUpdateBody}
      designLocked={isDesignLocked}
      submitLabel={isContestMode ? "確認投稿" : "確認送出"}
      onSubmit={handleSubmitRequest}
    />
  ) : (
    resultPanelNode
  );

  return (
    <LiveDesignStateProvider
      size={size}
      side={side}
      layers={layers}
      selectedLayerId={primaryId}
    >
    <ArtworkSizeCoordinateProvider ctx={designerCoordinateContext}>
    <PlacementPresetSizeProvider size={size}>
    <div className="flex h-full flex-col bg-zinc-50 text-zinc-900">
      <div className="flex min-h-0 flex-1">
        <div className="hidden shrink-0 lg:flex">
          <IconNav active={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === "product" && (
          <div className="hidden shrink-0 lg:contents" data-layout-zone="product-desktop">
            {productPanelNode}
          </div>
        )}

        <div className="hidden shrink-0 lg:contents" data-layout-zone="design-desktop">
          <DesignPanel
            activeTab={activeTab}
            layers={layers}
            selectedIds={selectedIds}
            isBusy={isBusy}
            showGrid={showGrid}
            debugPrintArea={debugPrintArea}
            gridSnapEnabled={gridSnapEnabled}
            largePrintModeEnabled={largePrintModeEnabled}
            elementSnapDistance={elementSnapDistance}
            onShowGridChange={setShowGrid}
            onDebugPrintAreaChange={setDebugPrintArea}
            previewPrintPositionMode={previewPrintPositionMode}
            onPreviewPrintPositionModeChange={setPreviewPrintPositionMode}
            onGridSnapChange={setGridSnapEnabled}
            onLargePrintModeChange={handleLargePrintModeChange}
            onElementSnapDistanceChange={setElementSnapDistance}
            onSelectLayer={handleSelectLayer}
            onRenameLayer={(id, name) => updateLayer(id, { name })}
            onToggleVisible={(id) => {
              const layer = layers.find((l) => l.id === id);
              if (layer) updateLayer(id, { visible: !layer.visible });
            }}
            onToggleLocked={(id) => {
              const layer = layers.find((l) => l.id === id);
              if (layer) updateLayer(id, { locked: !layer.locked });
            }}
            onMoveLayer={(id, action) => {
              prepareDiscreteMutation();
              setLayers((prev) => moveLayerZIndex(prev, id, action));
            }}
            onDuplicateLayer={(id) => void handleDuplicate(id)}
            onDeleteLayer={deleteLayerById}
            onReorderDrag={(dragId, targetId) => {
              prepareDiscreteMutation();
              setLayers((prev) => reorderLayersByDrag(prev, dragId, targetId));
            }}
          />
        </div>

        <div
          className={`relative flex min-h-0 min-w-0 flex-col max-md:pb-28 ${ds.layout.canvas}`}
          data-layout-zone="canvas"
        >
          <div
            className={`hidden items-center ${ds.space.gap2} border-b border-zinc-200 bg-white px-3 py-2 md:flex lg:hidden`}
          >
            <button
              type="button"
              onClick={() => {
                setLeftDrawerOpen(true);
                setRightDrawerOpen(false);
              }}
              className={ds.button.secondary}
            >
              商品設定
            </button>
            <button
              type="button"
              onClick={() => {
                setRightDrawerOpen(true);
                setLeftDrawerOpen(false);
              }}
              className={ds.button.secondary}
            >
              預覽・下單
            </button>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col max-md:rounded-none max-md:[&>div]:rounded-none max-md:[&>div]:border-0 max-md:[&>div]:p-0">
          <DesignCanvas
          gender={gender}
          shirtColor={shirtColor}
          size={size}
          side={side}
          bluePrintArea={maxPrintBounds}
          layers={layers}
          layersByTemplate={layersByTemplate}
          selectedIds={selectedIds}
          showGrid={showGrid || debugPrintArea}
          debugPrintArea={debugPrintArea}
          previewPrintPositionMode={previewPrintPositionMode}
          gridSnapEnabled={gridSnapEnabled}
          largePrintModeEnabled={largePrintModeEnabled}
          elementSnapDistance={elementSnapDistance}
          isBusy={isBusy}
          readOnly={isDesignLocked}
          focusTextEditor={focusTextEditor}
          pendingTextEditLayerId={pendingTextEditLayerId}
          onPendingTextEditConsumed={() => setPendingTextEditLayerId(null)}
          warnings={warnings}
          onSelectLayer={handleSelectLayer}
          onLayerTransformChange={(id, next) => {
            if (isDesignLocked || layers.find((l) => l.id === id)?.locked) {
              return;
            }
            scheduleClampedLayerTransform(id, next);
          }}
          onLayerRotationChange={(id, rotation) => {
            if (isDesignLocked || layers.find((l) => l.id === id)?.locked) {
              return;
            }
            scheduleClampedLayerTransform(id, { rotation });
          }}
          onDragTransformFlush={flushDragTransformScheduler}
          onDragTransformCancel={cancelDragTransformScheduler}
          onQuickRotate90={(clockwise) => {
            if (isDesignLocked || selectedIds.length === 0) return;
            rotateLayersQuick90(selectedIds, clockwise, true);
          }}
          onLayerResize={(id, next, lockAspect) => {
            if (isDesignLocked || layers.find((l) => l.id === id)?.locked) {
              return;
            }
            applyLayerResize(id, next, lockAspect);
          }}
          onLayerToolbarScale={(id, factor) => {
            if (isDesignLocked || layers.find((l) => l.id === id)?.locked) {
              return;
            }
            applyLayerToolbarScale(id, factor);
          }}
          onClearSelection={() => setSelectedIds([])}
          onFocusTextEditorConsumed={() => setFocusTextEditor(false)}
          onSideChange={setSide}
          onDuplicateLayer={(id) => void handleDuplicate(id)}
          onDeleteLayer={deleteLayerById}
          onMoveLayer={(id, action) => {
            if (isDesignLocked) return;
            prepareDiscreteMutation();
            setLayers((prev) => moveLayerZIndex(prev, id, action));
          }}
          onRenameLayer={(id, name) => updateLayer(id, { name })}
          onToggleVisible={(id) => {
            const layer = layers.find((l) => l.id === id);
            if (layer) updateLayer(id, { visible: !layer.visible });
          }}
          onToggleLocked={(id) => {
            const layer = layers.find((l) => l.id === id);
            if (layer) updateLayer(id, { locked: !layer.locked });
          }}
          onReorderDrag={(dragId, targetId) => {
            if (isDesignLocked) return;
            prepareDiscreteMutation();
            setLayers((prev) => reorderLayersByDrag(prev, dragId, targetId));
          }}
          onUpload={handleUpload}
          onAddText={handleAddText}
          onAddShape={handleAddShape}
          onTextStylePatch={handleTextStylePatch}
          onImageStylePatch={handleImageStylePatch}
          onShapeStylePatch={handleShapeStylePatch}
          onTextChange={(patch) => {
            if (primaryId && primaryLayer?.type === "text") {
              setFocusTextEditor(false);
              updateLayer(primaryId, patch);
            }
          }}
          onTextPatch={handleTextInspectorPatch}
          onImageTransform={handleInspectorImageTransform}
          onImageResize={handleInspectorImageResize}
          onArtworkSizePatch={handleArtworkSizePatch}
          onBoostImageResolution={handleBoostImageResolution}
          onRotationChange={handleInspectorRotation}
          onAlignLayers={handleAlignLayers}
          onApplyPlacementPreset={handleApplyPlacementPreset}
          activePlacementPresetId={pendingPlacementPresetId}
          onFitToPrintableArea={handleFitToPrintableArea}
          onClearCurrentSlotDesign={handleClearCurrentSlotDesign}
          onClearAllDesign={handleClearAllDesign}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndoClick}
          onRedo={handleRedoClick}
        />
          </div>

          {mobileNavTab === "design" ? (
            <div
              className={`fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur-sm md:hidden ${ds.shadow.card}`}
            >
              <button
                type="button"
                disabled={isBusy || !hasDesign || isDesignLocked}
                onClick={handleSubmitRequest}
                className={`w-full ${ds.button.primary}`}
              >
                {isContestMode ? "確認投稿" : "確認送出"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="hidden shrink-0 lg:contents" data-layout-zone="right-desktop">
          {garmentInfoPanel}
        </div>

        <LayoutDrawer
          open={leftDrawerOpen}
          onClose={() => setLeftDrawerOpen(false)}
          side="left"
          ariaLabel="商品設定"
          widthClassName={ds.layout.drawer}
        >
          <div className={panelHostClassName}>
            {activeTab === "product" ? productPanelNode : (
              <DesignPanel
                activeTab={activeTab}
                layers={layers}
                selectedIds={selectedIds}
                isBusy={isBusy}
                showGrid={showGrid}
                debugPrintArea={debugPrintArea}
                gridSnapEnabled={gridSnapEnabled}
                largePrintModeEnabled={largePrintModeEnabled}
                elementSnapDistance={elementSnapDistance}
                onShowGridChange={setShowGrid}
                onDebugPrintAreaChange={setDebugPrintArea}
                previewPrintPositionMode={previewPrintPositionMode}
                onPreviewPrintPositionModeChange={setPreviewPrintPositionMode}
                onGridSnapChange={setGridSnapEnabled}
                onLargePrintModeChange={handleLargePrintModeChange}
                onElementSnapDistanceChange={setElementSnapDistance}
                onSelectLayer={handleSelectLayer}
                onRenameLayer={(id, name) => updateLayer(id, { name })}
                onToggleVisible={(id) => {
                  const layer = layers.find((l) => l.id === id);
                  if (layer) updateLayer(id, { visible: !layer.visible });
                }}
                onToggleLocked={(id) => {
                  const layer = layers.find((l) => l.id === id);
                  if (layer) updateLayer(id, { locked: !layer.locked });
                }}
                onMoveLayer={(id, action) => {
                  prepareDiscreteMutation();
                  setLayers((prev) => moveLayerZIndex(prev, id, action));
                }}
                onDuplicateLayer={(id) => void handleDuplicate(id)}
                onDeleteLayer={deleteLayerById}
                onReorderDrag={(dragId, targetId) => {
                  prepareDiscreteMutation();
                  setLayers((prev) => reorderLayersByDrag(prev, dragId, targetId));
                }}
              />
            )}
          </div>
        </LayoutDrawer>

        <LayoutDrawer
          open={rightDrawerOpen}
          onClose={() => setRightDrawerOpen(false)}
          side="right"
          ariaLabel="預覽・下單"
          widthClassName={ds.layout.drawer}
        >
          <div className={`flex min-h-full flex-col ${panelHostClassName}`}>
            {resultPanelNode}
          </div>
        </LayoutDrawer>

        <LayoutBottomSheet
          open={mobileSheet === "product"}
          onClose={closeMobileSheet}
          ariaLabel="商品"
        >
          <div className={panelHostClassName}>{productPanelNode}</div>
        </LayoutBottomSheet>

        <LayoutBottomSheet
          open={mobileSheet === "preview"}
          onClose={closeMobileSheet}
          ariaLabel="成品預覽"
        >
          <div className={panelHostClassName}>{mobilePreviewPanelNode}</div>
        </LayoutBottomSheet>

        <LayoutBottomSheet
          open={mobileSheet === "checkout"}
          onClose={closeMobileSheet}
          ariaLabel="下單"
          maxHeightClassName="max-h-[min(92vh,40rem)]"
        >
          <div className={panelHostClassName}>{mobileCheckoutPanelNode}</div>
        </LayoutBottomSheet>

        <DesignerBottomNav
          active={mobileNavTab}
          onChange={handleMobileNavChange}
        />
      </div>

      {cloudSyncWarning && (
        <div
          className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900"
          role="status"
        >
          雲端同步失敗：{cloudSyncWarning}（本機暫存仍可用）
        </div>
      )}

      {statusMessage && (
        <DesignerToast
          message={statusMessage}
          onDismiss={() => setStatusMessage(null)}
        />
      )}

      {isContestMode ? (
        <ContestSubmitModal
          open={showContestSubmitModal}
          isBusy={isBusy}
          form={contestApplicationForm}
          onChange={(patch) =>
            setContestApplicationForm((prev) => ({ ...prev, ...patch }))
          }
          onClose={() => setShowContestSubmitModal(false)}
          onConfirm={() => void handleSubmitConfirm()}
        />
      ) : (
        <SubmitApplicationModal
          open={showSubmitModal}
          isBusy={isBusy}
          form={applicationForm}
          onChange={(patch) =>
            setApplicationForm((prev) => ({ ...prev, ...patch }))
          }
          onClose={() => setShowSubmitModal(false)}
          onConfirm={() => void handleSubmitConfirm()}
        />
      )}

      <UploadValidationModal
        open={uploadAlertDetail !== null}
        detail={uploadAlertDetail}
        onClose={() => setUploadAlertDetail(null)}
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

      {submissionSuccess && (
        <SubmissionSuccessModal
          submissionNo={submissionSuccess.submissionNo}
          applicantName={submissionSuccess.applicantName}
        />
      )}
    </div>
    </PlacementPresetSizeProvider>
    </ArtworkSizeCoordinateProvider>
    </LiveDesignStateProvider>
  );
}
