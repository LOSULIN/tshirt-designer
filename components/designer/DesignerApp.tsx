"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DesignCanvas } from "./DesignCanvas";
import { DesignPanel } from "./DesignPanel";
import { LiveDesignStateProvider } from "./LiveDesignStateContext";
import { IconNav } from "./IconNav";
import { ModelPanel } from "./ModelPanel";
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
import { applyDragSnap, getInitialPlacement } from "@/lib/geometry";
import { getStaggeredPlacement } from "@/lib/layer-placement";
import {
  fitDesignLayers,
  fitImageLayer,
  fitTextLayer,
} from "@/lib/layer-constraints";
import {
  createDefaultTextLayer,
  measureTextBoundsCm,
} from "@/lib/text-layer";
import {
  canAddImageLayer,
  canAddTextLayer,
  createImageLayer,
  defaultLayerName,
  duplicateImageLayerAsync,
  duplicateTextLayer,
  getNextZIndex,
  imageLayerLimitMessage,
  layersToDraftSnapshot,
  moveLayerZIndex,
  reorderLayersByDrag,
  revokeLayerAssets,
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
  TextDesignLayer,
  UploadedDesignImage,
} from "@/lib/types";
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
          migrateDesignLayersToCm(
            migrateLayersFromLegacyCanvasUnits(hydrated),
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
};

export function DesignerApp({ mode = DESIGNER_MODE_DEFAULT }: DesignerAppProps) {
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
  const [gridSnapEnabled, setGridSnapEnabled] = useState(true);
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

  const updateLayer = useCallback(
    (id: string, patch: Partial<DesignLayer>) => {
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;
          const merged = { ...layer, ...patch } as DesignLayer;
          if (merged.type === "text") {
            return fitTextLayer(merged, printArea);
          }
          if (merged.type === "image") {
            return fitImageLayer(merged, printArea);
          }
          return merged;
        }),
      );
    },
    [setLayers, printArea],
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
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;

          const nextRotation = patch.rotation ?? layer.rotation;
          const positionChanged =
            patch.x_cm !== undefined || patch.y_cm !== undefined;

          if (layer.type === "text") {
            const nextScale = patch.scale ?? layer.scale;
            const { width_cm, height_cm } = measureTextBoundsCm(
              layer.text,
              layer.fontSize_cm * nextScale,
              layer.fontFamily,
              layer.fontWeight,
            );

            let nextX = patch.x_cm ?? layer.x_cm;
            let nextY = patch.y_cm ?? layer.y_cm;

            if (positionChanged) {
              const snap = applyDragSnap(
                nextX,
                nextY,
                width_cm,
                height_cm,
                1,
                printArea,
                {
                  gridSnap: gridSnapEnabled,
                  elementSnap: true,
                  elementSnapThreshold: elementSnapDistance,
                  otherElements: buildSnapTargetsFromLayers(
                    id,
                    prev.filter((l) => l.visible && !l.locked),
                  ),
                },
              );
              nextX = snap.x;
              nextY = snap.y;
            }

            return fitTextLayer(
              {
                ...layer,
                x_cm: nextX,
                y_cm: nextY,
                scale: nextScale,
                rotation: nextRotation,
                width_cm,
                height_cm,
              },
              printArea,
            );
          }

          const nextScale = patch.scale ?? layer.scale;
          let nextX = patch.x_cm ?? layer.x_cm;
          let nextY = patch.y_cm ?? layer.y_cm;

          if (positionChanged) {
            const snap = applyDragSnap(
              nextX,
              nextY,
              layer.width_cm,
              layer.height_cm,
              nextScale,
              printArea,
              {
                gridSnap: gridSnapEnabled,
                elementSnap: true,
                elementSnapThreshold: elementSnapDistance,
                otherElements: buildSnapTargetsFromLayers(
                  id,
                  prev.filter((l) => l.visible && !l.locked),
                ),
              },
            );
            nextX = snap.x;
            nextY = snap.y;
          }

          return fitImageLayer(
            {
              ...layer,
              x_cm: nextX,
              y_cm: nextY,
              scale: nextScale,
              rotation: nextRotation,
            },
            printArea,
          );
        }),
      );
    },
    [setLayers, printArea, gridSnapEnabled, elementSnapDistance],
  );

  const applyLayerResize = useCallback(
    (
      id: string,
      next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
    ) => {
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;

          if (layer.type === "image") {
            const nextScale = next.width_cm / layer.width_cm;
            return fitImageLayer(
              {
                ...layer,
                x_cm: next.x_cm,
                y_cm: next.y_cm,
                scale: nextScale,
              },
              printArea,
            );
          }

          const unit = measureTextBoundsCm(
            layer.text,
            layer.fontSize_cm,
            layer.fontFamily,
            layer.fontWeight,
          );
          const nextScale =
            unit.height_cm > 0 ? next.height_cm / unit.height_cm : layer.scale;

          return fitTextLayer(
            {
              ...layer,
              x_cm: next.x_cm,
              y_cm: next.y_cm,
              scale: nextScale,
            },
            printArea,
          );
        }),
      );
    },
    [setLayers, printArea],
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
      setLayersByTemplate((prev) => {
        const target = getLayersForSlot(prev, gender, side).find(
          (l) => l.id === id,
        );
        if (target) {
          revokeLayerAssets(target);
          void draftStorage.clearLayerImages(id);
        }
        const next = updateLayersForSlot(prev, gender, side, (current) =>
          current.filter((l) => l.id !== id),
        );
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
    [draftStorage, gender, side, guardEditable],
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
      setStatusMessage("已恢復未送出的暫存設計");
    }
  }, [draftStorage]);

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
        mimeType: file.type,
        fileName: file.name,
      };

      const newLayer = fitImageLayer(
        createImageLayer(layers, uploaded, staggeredPlacement),
        printArea,
      );
      setLayers((prev) => [...prev, newLayer]);
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
  }, [draftStorage, gender, side]);

  const handleClearAllDesign = useCallback(() => {
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
  }, [draftStorage, layersByTemplate]);

  const handleAddText = () => {
    if (!guardEditable()) return;
    if (!canAddTextLayer(layers)) {
      setWarnings([textLayerLimitMessage()]);
      return;
    }

    const layer = createDefaultTextDesignLayer(layers, printArea);
    setLayers((prev) => [...prev, layer]);
    setSelectedIds([layer.id]);
    setPendingTextEditLayerId(layer.id);
    setStatusMessage("已新增文字 TEST，輸入後按 Enter 或點擊空白確認");
  };

  const handleDuplicate = async (id: string) => {
    const source = layers.find((l) => l.id === id);
    if (!source) return;

    if (source.type === "image") {
      const dup = await duplicateImageLayerAsync(layers, id);
      if (dup && dup.type === "image") {
        const fitted = fitImageLayer(dup, printArea);
        setLayers((prev) => [...prev, fitted]);
        setSelectedIds([fitted.id]);
      }
    } else {
      const dup = duplicateTextLayer(layers, id);
      if (dup) {
        const fitted = fitTextLayer(dup, printArea);
        setLayers((prev) => [...prev, fitted]);
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

      setStatusMessage("Proof Engine 產生校稿檔案中…");
      const proofArtifacts = await prepareProofSubmission(proofOrder);

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
          gridSnapEnabled={gridSnapEnabled}
          elementSnapDistance={elementSnapDistance}
          onShowGridChange={setShowGrid}
          onGridSnapChange={setGridSnapEnabled}
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
            setLayers((prev) => moveLayerZIndex(prev, id, action));
          }}
          onDuplicateLayer={(id) => void handleDuplicate(id)}
          onDeleteLayer={deleteLayerById}
          onReorderDrag={(dragId, targetId) => {
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
          showGrid={showGrid}
          gridSnapEnabled={gridSnapEnabled}
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
            setLayers((prev) => moveLayerZIndex(prev, id, action));
          }}
          onUpload={handleUpload}
          onAddText={handleAddText}
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
          onClearCurrentSlotDesign={handleClearCurrentSlotDesign}
          onClearAllDesign={handleClearAllDesign}
        />

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
