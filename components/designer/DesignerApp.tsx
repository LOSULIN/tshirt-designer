"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DesignCanvas } from "./DesignCanvas";
import { DesignPanel } from "./DesignPanel";
import { LiveDesignStateProvider } from "./LiveDesignStateContext";
import { IconNav } from "./IconNav";
import { GarmentInfoPanel } from "./GarmentInfoPanel";
import { ModelPanel } from "./ModelPanel";
import { UI_VISIBILITY } from "./ui-visibility";
import { ProductPanel } from "./ProductPanel";
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
  getPrintAreaCmBounds,
  migrateDesignLayersToCm,
  type PrintAreaCmBounds,
} from "@/lib/design-cm";
import {
  getExportDimensions,
  migrateLayersFromLegacyCanvasUnits,
} from "@/lib/print-area";
import { DEFAULT_PRINT_MODE } from "@/lib/printArea";
import { getInitialPlacement } from "@/lib/geometry";
import { getStaggeredPlacement } from "@/lib/layer-placement";
import { getLayerEffectiveCmRect } from "@/lib/design-cm";
import {
  applyClampedLayerPatch,
  fitDesignLayers,
  fitImageLayer,
  fitShapeLayer,
  fitTextLayer,
} from "@/lib/layer-constraints";
import {
  rotateClockwise90,
  rotateCounterClockwise90,
} from "@/lib/layer-rotation";
import {
  clampRasterPrintDimensions,
  getImageFitOptions,
} from "@/lib/image-print-quality";
import {
  applyLayerPlacementPreset,
  getPlacementPresetById,
  type PlacementPresetId,
} from "@/lib/placement-presets";
import { normalizeDesignLayers } from "@/lib/layer-normalize";
import { createDefaultShapeLayer } from "@/lib/shape-layer";
import { createDefaultTextLayer } from "@/lib/text-layer";
import { DEFAULT_RICH_TEXT_FIELDS } from "@/lib/text-style";
import {
  canAddImageLayer,
  canAddShapeLayer,
  canAddTextLayer,
  createImageLayer,
  defaultLayerName,
  duplicateImageLayerAsync,
  duplicateShapeLayer,
  duplicateTextLayer,
  getNextZIndex,
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
  alignDesignLayers,
  countAlignableLayers,
  type LayerAlignmentAxis,
} from "@/lib/layer-alignment";
import { useDesignHistory } from "@/hooks/useDesignHistory";
import { nanoid } from "nanoid";

function createDefaultTextDesignLayer(
  layers: DesignLayer[],
  printArea: PrintAreaCmBounds,
): TextDesignLayer {
  const base = createDefaultTextLayer(printArea);
  const stagger = getStaggeredPlacement(
    printArea,
    base.width_cm,
    base.height_cm,
    layers.length,
  );
  return fitTextLayer(
    {
      id: base.id,
      name: defaultLayerName(layers, "text"),
      type: "text",
      visible: true,
      locked: false,
      zIndex: getNextZIndex(layers),
      x_cm: stagger.x_cm,
      y_cm: stagger.y_cm,
      width_cm: base.width_cm,
      height_cm: base.height_cm,
      scale: base.scale,
      rotation: base.rotation,
      text: base.text,
      fontSize_cm: base.fontSize_cm,
      fontFamily: base.fontFamily,
      color: base.color,
      opacity: base.opacity,
      fontWeight: base.fontWeight,
      ...DEFAULT_RICH_TEXT_FIELDS,
    },
    printArea,
  );
}

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
      mimeType: original.type,
      fileName: layer.image?.fileName ?? "draft",
    },
  };
}

async function hydrateDesignLayersByTemplate(
  snapshot: ReturnType<typeof layersByTemplateToDraftSnapshot>,
  draftStorage: DraftStorage,
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
        fitDesignLayers(
          normalizeDesignLayers(
            migrateDesignLayersToCm(
              migrateLayersFromLegacyCanvasUnits(hydrated),
            ),
          ),
          getPrintAreaCmBounds(),
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
  const [elementSnapDistance, setElementSnapDistance] = useState(10);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
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

  const printArea = useMemo(() => getPrintAreaCmBounds(), []);
  const exportDims = useMemo(() => getExportDimensions(), []);

  const setLayers = useCallback(
    (updater: DesignLayer[] | ((prev: DesignLayer[]) => DesignLayer[])) => {
      setLayersByTemplate((prev) =>
        updateLayersForSlot(prev, gender, side, (current) => {
          const next =
            typeof updater === "function" ? updater(current) : updater;
          return fitDesignLayers(next, getPrintAreaCmBounds());
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
  } = useDesignHistory({
    layers,
    gender,
    side,
    enabled: !isDesignLocked && !isBusy,
    onRestore: restoreLayersFromHistory,
  });

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
          const merged = { ...layer, ...patch } as DesignLayer;
          if (merged.type === "text") {
            return fitTextLayer(merged, printArea);
          }
          if (merged.type === "image") {
            return fitImageLayer(
              merged,
              printArea,
              getImageFitOptions(largePrintModeEnabled),
            );
          }
          if (merged.type === "shape") {
            return fitShapeLayer(merged, printArea);
          }
          return merged;
        }),
      );
    },
    [
      setLayers,
      printArea,
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
          return applyClampedLayerPatch(layer, patch, printArea, {
            gridSnap: gridSnapEnabled,
            elementSnapThreshold: elementSnapDistance,
            otherElements: buildSnapTargetsFromLayers(
              id,
              prev.filter((l) => l.visible && !l.locked),
            ),
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
      printArea,
      gridSnapEnabled,
      elementSnapDistance,
      largePrintModeEnabled,
      markGestureMutation,
    ],
  );

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
          return applyClampedLayerPatch(
            layer,
            { rotation: nextRotation },
            printArea,
            {
              gridSnap: gridSnapEnabled,
              elementSnapThreshold: elementSnapDistance,
              otherElements: buildSnapTargetsFromLayers(
                layer.id,
                prev.filter((entry) => entry.visible && !entry.locked),
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
      printArea,
      gridSnapEnabled,
      elementSnapDistance,
      largePrintModeEnabled,
    ],
  );

  const applyLayerResize = useCallback(
    (
      id: string,
      next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
    ) => {
      markGestureMutation();
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;

          const current = getLayerEffectiveCmRect(layer);
          const anchorCenterX = current.x_cm + current.width_cm / 2;
          const anchorCenterY = current.y_cm + current.height_cm / 2;

          if (layer.type === "text") {
            const factor =
              current.height_cm > 0 ? next.height_cm / current.height_cm : 1;
            if (Math.abs(factor - 1) < 1e-6) return layer;

            return fitTextLayer(
              {
                ...layer,
                scale: layer.scale * factor,
              },
              printArea,
              {
                anchorCenter: {
                  x_cm: anchorCenterX,
                  y_cm: anchorCenterY,
                },
              },
            );
          }

          const scaleW =
            current.width_cm > 0 ? next.width_cm / current.width_cm : 1;
          const scaleH =
            current.height_cm > 0 ? next.height_cm / current.height_cm : 1;
          const factor =
            Math.abs(scaleW - 1) >= Math.abs(scaleH - 1) ? scaleW : scaleH;

          if (layer.type === "shape") {
            return fitShapeLayer(
              {
                ...layer,
                width_cm: next.width_cm,
                height_cm: next.height_cm,
                scale: 1,
                x_cm: anchorCenterX - next.width_cm / 2,
                y_cm: anchorCenterY - next.height_cm / 2,
              },
              printArea,
            );
          }

          if (layer.type === "image") {
            const rasterFit = getImageFitOptions(largePrintModeEnabled);
            const clamped = clampRasterPrintDimensions(
              next.width_cm,
              next.height_cm,
              rasterFit.maxPrintWidth_cm,
              rasterFit.maxPrintHeight_cm,
            );
            const clampedScaleW =
              current.width_cm > 0 ? clamped.width_cm / current.width_cm : 1;
            const clampedScaleH =
              current.height_cm > 0 ? clamped.height_cm / current.height_cm : 1;
            const clampedFactor =
              Math.abs(clampedScaleW - 1) >= Math.abs(clampedScaleH - 1)
                ? clampedScaleW
                : clampedScaleH;

            return fitImageLayer(
              {
                ...layer,
                x_cm: next.x_cm,
                y_cm: next.y_cm,
                scale: layer.scale * clampedFactor,
              },
              printArea,
              rasterFit,
            );
          }

          return layer;
        }),
      );
    },
    [setLayers, printArea, largePrintModeEnabled, markGestureMutation],
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
        updateLayer(id, { fontSize_cm: patch.fontSize_cm, scale: 1 });
        return;
      }
      if (patch.text !== undefined) {
        updateLayer(id, { text: patch.text });
      }
    },
    [guardEditable, updateLayer, applyClampedLayerTransform],
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
    ) => {
      if (!guardEditable()) return;
      applyLayerResize(id, next);
    },
    [guardEditable, applyLayerResize],
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
      setStatusMessage("已刪除圖層");
    },
    [
      draftStorage,
      gender,
      side,
      guardEditable,
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

      const preview = await createPreviewFromFile(file);
      const placement = getInitialPlacement(
        preview.naturalWidth,
        preview.naturalHeight,
        printArea,
      );
      const stagger = getStaggeredPlacement(
        printArea,
        placement.width_cm,
        placement.height_cm,
        layers.length,
      );
      const staggeredPlacement = {
        ...placement,
        x_cm: stagger.x_cm,
        y_cm: stagger.y_cm,
      };

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
        mimeType: file.type,
        fileName: file.name,
      };

      const newLayer = fitImageLayer(
        createImageLayer(layers, uploaded, staggeredPlacement),
        printArea,
        getImageFitOptions(largePrintModeEnabled),
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
      setStatusMessage("圖片已上傳，可拖曳、縮放與旋轉");
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

    const layer = createDefaultTextDesignLayer(layers, printArea);
    appendLayers(layer);
    setSelectedIds([layer.id]);
    setPendingTextEditLayerId(layer.id);
    setStatusMessage("已新增文字 TEST，輸入後按 Enter 或點擊空白確認");
  };

  const handleAddShape = (kind: ShapeKind) => {
    if (!guardEditable()) return;
    if (!canAddShapeLayer(layers)) {
      setWarnings([shapeLayerLimitMessage()]);
      return;
    }

    const layer = fitShapeLayer(
      createDefaultShapeLayer(kind, layers, printArea),
      printArea,
    );
    appendLayers(layer);
    setSelectedIds([layer.id]);
    setStatusMessage(`已新增${layer.name}`);
  };

  const handleTextStylePatch = useCallback(
    (id: string, patch: Partial<TextDesignLayer>) => {
      if (!guardEditable()) return;
      updateLayer(id, patch);
    },
    [guardEditable, updateLayer],
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
        alignDesignLayers(prev, selectedIds, axis, printArea),
      );
    },
    [
      guardEditable,
      layers,
      selectedIds,
      prepareDiscreteMutation,
      setLayers,
      printArea,
    ],
  );

  const handleApplyPlacementPreset = useCallback(
    (presetId: PlacementPresetId) => {
      if (!guardEditable()) return;
      const preset = getPlacementPresetById(presetId);
      if (!preset || !preset.sides.includes(side)) return;

      const targetIds = selectedIds.filter((id) => {
        const layer = layers.find((entry) => entry.id === id);
        return layer && !layer.locked;
      });
      if (targetIds.length === 0) return;

      prepareDiscreteMutation();
      const idSet = new Set(targetIds);
      setLayers((prev) =>
        prev.map((layer) => {
          if (!idSet.has(layer.id)) return layer;
          return applyLayerPlacementPreset(layer, preset, printArea, {
            largePrintMode: largePrintModeEnabled,
          });
        }),
      );
    },
    [
      guardEditable,
      side,
      selectedIds,
      layers,
      prepareDiscreteMutation,
      setLayers,
      printArea,
      largePrintModeEnabled,
    ],
  );

  const handleLargePrintModeChange = useCallback(
    (enabled: boolean) => {
      if (!guardEditable()) return;
      prepareDiscreteMutation();
      setLargePrintModeEnabled(enabled);
      if (enabled) return;

      const rasterFit = getImageFitOptions(false);
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.type !== "image") return layer;
          return fitImageLayer(layer, printArea, rasterFit);
        }),
      );
    },
    [guardEditable, prepareDiscreteMutation, setLayers, printArea],
  );

  const handleDuplicate = async (id: string) => {
    const source = layers.find((l) => l.id === id);
    if (!source) return;

    if (source.type === "image") {
      const dup = await duplicateImageLayerAsync(layers, id);
      if (dup && dup.type === "image") {
        const fitted = fitImageLayer(dup, printArea);
        appendLayers(fitted);
        setSelectedIds([fitted.id]);
      }
    } else if (source.type === "shape") {
      const dup = duplicateShapeLayer(layers, id);
      if (dup) {
        const fitted = fitShapeLayer(dup, printArea);
        appendLayers(fitted);
        setSelectedIds([fitted.id]);
      }
    } else {
      const dup = duplicateTextLayer(layers, id);
      if (dup) {
        const fitted = fitTextLayer(dup, printArea);
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
    setLayersByTemplate((prev) => {
      let next = prev;
      for (const templateGender of DESIGN_GENDERS) {
        for (const templateSide of DESIGN_SIDES) {
          next = setLayersForSlot(
            next,
            templateGender,
            templateSide,
            fitDesignLayers(
              getLayersForSlot(next, templateGender, templateSide),
              getPrintAreaCmBounds(),
            ),
          );
        }
      }
      return next;
    });
  };

  const handleUpdateBody = () => {
    setSuggestedSize(suggestSize(heightCm, weightKg));
  };

  return (
    <LiveDesignStateProvider
      size={size}
      layers={layers}
      selectedLayerId={primaryId}
    >
    <div className="flex h-full flex-col bg-zinc-50 text-zinc-900">
      <div className="flex min-h-0 flex-1">
        <IconNav active={activeTab} onChange={setActiveTab} />

        {activeTab === "product" && (
          <ProductPanel
            shirtColor={shirtColor}
            material={material}
            size={size}
            onColorChange={handleShirtColorChange}
            onMaterialChange={setMaterial}
            onSizeChange={setSize}
            hideColorPicker={isContestMode}
          />
        )}

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

        <DesignCanvas
          gender={gender}
          shirtColor={shirtColor}
          size={size}
          side={side}
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
            applyClampedLayerTransform(id, next);
          }}
          onLayerRotationChange={(id, rotation) => {
            if (isDesignLocked || layers.find((l) => l.id === id)?.locked) {
              return;
            }
            applyClampedLayerTransform(id, { rotation });
          }}
          onQuickRotate90={(clockwise) => {
            if (isDesignLocked || selectedIds.length === 0) return;
            rotateLayersQuick90(selectedIds, clockwise, true);
          }}
          onLayerResize={(id, next) => {
            if (isDesignLocked || layers.find((l) => l.id === id)?.locked) {
              return;
            }
            applyLayerResize(id, next);
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
          onRotationChange={handleInspectorRotation}
          onAlignLayers={handleAlignLayers}
          onApplyPlacementPreset={handleApplyPlacementPreset}
          onClearCurrentSlotDesign={handleClearCurrentSlotDesign}
          onClearAllDesign={handleClearAllDesign}
        />

        {UI_VISIBILITY.showModelPanel ? (
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
            submitLabel={isContestMode ? "確認投稿" : "確認發送申請"}
            onSubmit={handleSubmitRequest}
          />
        ) : (
          <GarmentInfoPanel
            size={size}
            onSizeChange={setSize}
            heightCm={heightCm}
            weightKg={weightKg}
            suggestedSize={suggestedSize}
            isBusy={isBusy}
            hasDesign={hasDesign}
            onHeightChange={setHeightCm}
            onWeightChange={setWeightKg}
            onUpdateBody={handleUpdateBody}
            designLocked={isDesignLocked}
            submitLabel={isContestMode ? "確認投稿" : "確認發送申請"}
            onSubmit={handleSubmitRequest}
          />
        )}
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
        <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-800">
          {statusMessage}
        </div>
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

      {submissionSuccess && (
        <SubmissionSuccessModal
          submissionNo={submissionSuccess.submissionNo}
          applicantName={submissionSuccess.applicantName}
        />
      )}
    </div>
    </LiveDesignStateProvider>
  );
}
