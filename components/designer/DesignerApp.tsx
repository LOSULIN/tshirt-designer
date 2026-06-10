"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DesignCanvas } from "./DesignCanvas";
import { DesignPanel } from "./DesignPanel";
import { IconNav } from "./IconNav";
import { ModelPanel } from "./ModelPanel";
import { ProductPanel } from "./ProductPanel";
import {
  contestFormToApplicantPayload,
  createEmptyContestSubmissionForm,
  type ContestSubmissionFormData,
} from "@/lib/contest-submission";
import { ContestSubmitSuccess } from "@/components/contest/ContestSubmitSuccess";
import { formatSubmissionDisplayLabel } from "@/lib/submission-no";
import { ContestSubmitModal } from "./ContestSubmitModal";
import { SubmitApplicationModal } from "./SubmitApplicationModal";
import { UploadValidationModal } from "./UploadValidationModal";
import type {
  Gender,
  Material,
  Product,
  ShirtColor,
  Side,
  Size,
} from "@/lib/constants";
import {
  DEFAULT_MODEL_ID,
  DRAFT_TTL_MS,
  PRODUCTS,
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
import {
  completedDesignFormField,
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
  renderCompletedDesignPng,
} from "@/lib/export-design";
import {
  getExportDimensionsForGender,
  getPrintAreaForGender,
} from "@/lib/print-area";
import type { PrintAreaBounds } from "@/lib/print-area";
import {
  applyDragSnap,
  clampPositionToPrintArea,
  getInitialPlacement,
} from "@/lib/geometry";
import {
  createDefaultTextLayer,
  measureTextBounds,
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

function withMeasuredTextLayer(
  layer: TextDesignLayer,
  printArea: PrintAreaBounds,
): TextDesignLayer {
  const { width, height } = measureTextBounds(
    layer.text,
    layer.fontSize * layer.scale,
    layer.fontFamily,
    layer.fontWeight,
  );
  const clamped = clampPositionToPrintArea(
    layer.x,
    layer.y,
    width,
    height,
    1,
    layer.rotation,
    printArea,
  );
  return { ...layer, width, height, x: clamped.x, y: clamped.y };
}

function createDefaultTextDesignLayer(
  layers: DesignLayer[],
  printArea: PrintAreaBounds,
): TextDesignLayer {
  const base = createDefaultTextLayer(printArea);
  return withMeasuredTextLayer(
    {
      id: base.id,
      name: defaultLayerName(layers, "text"),
      type: "text",
      visible: true,
      locked: false,
      zIndex: getNextZIndex(layers),
      x: base.x,
      y: base.y,
      width: base.width,
      height: base.height,
      scale: base.scale,
      rotation: base.rotation,
      text: base.text,
      fontSize: base.fontSize,
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
        hydrated,
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
  const [product, setProduct] = useState<Product>("basic-tshirt");
  const [size, setSize] = useState<Size>("M");
  const [shirtColor, setShirtColor] = useState<ShirtColor>("white");
  const fit = "standard" as const;
  const [material, setMaterial] = useState<Material>("cotton-200");
  const [modelId, setModelId] = useState("child-male-1");
  const [heightCm, setHeightCm] = useState(175);
  const [weightKg, setWeightKg] = useState(65);
  const [suggestedSize, setSuggestedSize] = useState<Size>("M");

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
  const [contestSubmitted, setContestSubmitted] = useState(false);
  const [contestSubmissionInfo, setContestSubmissionInfo] = useState<{
    submissionNo: string;
    authorName: string;
  } | null>(null);
  const [uploadAlertDetail, setUploadAlertDetail] = useState<string | null>(
    null,
  );
  const [focusTextEditor, setFocusTextEditor] = useState(false);
  const [applicationForm, setApplicationForm] =
    useState<ApplicationFormData>(EMPTY_FORM);
  const [contestApplicationForm, setContestApplicationForm] =
    useState<ContestSubmissionFormData>(EMPTY_CONTEST_FORM);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const layers = useMemo(
    () => getLayersForSlot(layersByTemplate, gender, side),
    [layersByTemplate, gender, side],
  );

  const printArea = useMemo(() => getPrintAreaForGender(gender), [gender]);
  const exportDims = useMemo(
    () => getExportDimensionsForGender(gender),
    [gender],
  );

  const setLayers = useCallback(
    (updater: DesignLayer[] | ((prev: DesignLayer[]) => DesignLayer[])) => {
      setLayersByTemplate((prev) =>
        updateLayersForSlot(prev, gender, side, (current) =>
          typeof updater === "function" ? updater(current) : updater,
        ),
      );
    },
    [gender, side],
  );

  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const primaryLayer = layers.find((l) => l.id === primaryId) ?? null;
  const hasDesign = hasAnyDesign(layersByTemplate);
  const selectedText =
    primaryLayer?.type === "text" ? primaryLayer : null;

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
    product: PRODUCTS[product].name,
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
          primaryLayer.width,
          primaryLayer.height,
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

  const updateLayer = useCallback(
    (id: string, patch: Partial<DesignLayer>) => {
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;
          const merged = { ...layer, ...patch } as DesignLayer;
          return merged.type === "text"
            ? withMeasuredTextLayer(merged, printArea)
            : merged;
        }),
      );
    },
    [setLayers, printArea],
  );

  const applyClampedLayerTransform = useCallback(
    (
      id: string,
      patch: Partial<{ x: number; y: number; scale: number; rotation: number }>,
    ) => {
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== id) return layer;

          const nextX = patch.x ?? layer.x;
          const nextY = patch.y ?? layer.y;
          const nextScale = patch.scale ?? layer.scale;
          const nextRotation = patch.rotation ?? layer.rotation;
          const layerScale = layer.type === "image" ? nextScale : 1;
          const textScale = layer.type === "text" ? nextScale : 1;

          let w = layer.width;
          let h = layer.height;
          if (layer.type === "text") {
            const measured = measureTextBounds(
              layer.text,
              layer.fontSize * textScale,
              layer.fontFamily,
              layer.fontWeight,
            );
            w = measured.width;
            h = measured.height;
          }

          const snap = applyDragSnap(
            nextX,
            nextY,
            w,
            h,
            layerScale,
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

          const clamped = clampPositionToPrintArea(
            snap.x,
            snap.y,
            w,
            h,
            layerScale,
            nextRotation,
            printArea,
          );

          if (layer.type === "text") {
            return withMeasuredTextLayer(
              {
                ...layer,
                x: clamped.x,
                y: clamped.y,
                scale: textScale,
                rotation: nextRotation,
              },
              printArea,
            );
          }

          return {
            ...layer,
            x: clamped.x,
            y: clamped.y,
            scale: nextScale,
            rotation: nextRotation,
          };
        }),
      );
    },
    [setLayers, printArea, gridSnapEnabled, elementSnapDistance],
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
    [draftStorage, gender, side],
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
      activeGender: gender,
      activeSide: side,
      config: activeConfig,
      hasImage: !!firstImage,
      layersByTemplate: layersByTemplateToDraftSnapshot(layersByTemplate),
      layers: layersToDraftSnapshot(layers),
    });

    await draftStorage.saveAllLayerImagesFromState(layersByTemplate);
  }, [draftId, draftStorage, gender, side, hasDesign, layers, layersByTemplate]);

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

      const newLayer = createImageLayer(layers, uploaded, placement);
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
    void draftStorage.clearAllDrafts();
    setDraftId(nanoid(12));
    setStatusMessage("已清除全部設計，可重新開始");
  }, [draftStorage, layersByTemplate]);

  const handleAddText = () => {
    if (!canAddTextLayer(layers)) {
      setWarnings([textLayerLimitMessage()]);
      return;
    }

    const layer = createDefaultTextDesignLayer(layers, printArea);
    setLayers((prev) => [...prev, layer]);
    setSelectedIds([layer.id]);
    setFocusTextEditor(true);
    setStatusMessage("已新增文字圖層，請在預覽畫布下方輸入文字");
  };

  const handleReset = () => {
    if (!primaryLayer || primaryLayer.locked) return;

    if (primaryLayer.type === "text") {
      const { width: w, height: h } = measureTextBounds(
        primaryLayer.text,
        primaryLayer.fontSize,
        primaryLayer.fontFamily,
        primaryLayer.fontWeight,
      );
      updateLayer(primaryLayer.id, {
        scale: 1,
        rotation: 0,
        width: w,
        height: h,
        x: (printArea.width - w) / 2,
        y: (printArea.height - h) / 2,
      });
      return;
    }

    const placement = getInitialPlacement(
      primaryLayer.image.naturalWidth,
      primaryLayer.image.naturalHeight,
      printArea,
    );
    updateLayer(primaryLayer.id, {
      x: placement.x,
      y: placement.y,
      scale: 1,
      rotation: 0,
      width: placement.width,
      height: placement.height,
    });
  };

  const handleDuplicate = async (id: string) => {
    const source = layers.find((l) => l.id === id);
    if (!source) return;

    if (source.type === "image") {
      const dup = await duplicateImageLayerAsync(layers, id);
      if (dup) {
        setLayers((prev) => [...prev, dup]);
        setSelectedIds([dup.id]);
      }
    } else {
      const dup = duplicateTextLayer(layers, id);
      if (dup) {
        setLayers((prev) => [...prev, dup]);
        setSelectedIds([dup.id]);
      }
    }
    setStatusMessage("已複製圖層");
  };

  const handleSave = async () => {
    if (!hasDesign) return;
    setIsBusy(true);
    setStatusMessage(null);
    try {
      await persistDraftLocally();
      const cloud = await syncDraftToServer();
      if (cloud.ok) {
        setCloudSyncWarning(null);
        setWarnings([]);
        setStatusMessage("設計已儲存（本機與雲端）");
      } else {
        setCloudSyncWarning(cloud.error);
        setWarnings([`雲端同步失敗：${cloud.error}`]);
        setStatusMessage("設計已儲存至本機（雲端同步失敗）");
      }
    } catch (error) {
      setWarnings([
        error instanceof Error ? error.message : "儲存失敗",
      ]);
    } finally {
      setIsBusy(false);
    }
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
        formData.append("productType", product);
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
          const previewBlob = await renderCompletedDesignPng(
            gender,
            templateSide,
            slotLayers,
          );

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
        setContestSubmissionInfo({
          submissionNo: data.submissionNo,
          authorName,
        });
        setContestSubmitted(true);
        setDraftId(nanoid(12));
        return;
      }

      const applicantPayload = applicationForm;

      const designJson = buildFullDesignJson(layersByTemplate, gender, side, {
        ...submissionMeta,
        applicant: applicantPayload,
      });
      const textJson = buildAllTextsJson(layersByTemplate);

      const formData = new FormData();
      let primaryCompleted: Blob | null = null;

      for (const templateGender of DESIGN_GENDERS) {
        for (const templateSide of DESIGN_SIDES) {
          const slotLayers = getLayersForSlot(
            layersByTemplate,
            templateGender,
            templateSide,
          );
          if (!hasDesignInSlot(layersByTemplate, templateGender, templateSide)) {
            continue;
          }
          const blob = await renderCompletedDesignPng(
            templateGender,
            templateSide,
            slotLayers,
          );
          const field = completedDesignFormField(templateGender, templateSide);
          formData.append(field, blob, `${field}.png`);
          if (templateGender === gender && templateSide === side) {
            primaryCompleted = blob;
          }
        }
      }

      if (!primaryCompleted) {
        throw new Error("沒有可送出的設計內容");
      }

      formData.append("completed", primaryCompleted, "completed.png");
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "送出失敗");
      }

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

      const emailInfo = data.email as
        | { sent: true }
        | { sent: false; message?: string }
        | undefined;

      const displayLabel = formatSubmissionDisplayLabel(
        data.submissionNo,
        applicationForm.applicantName,
      );

      if (emailInfo?.sent) {
        setStatusMessage(
          `申請已發送！編號：${displayLabel}（已儲存至雲端並寄送 Email 通知）`,
        );
      } else if (emailInfo && !emailInfo.sent && emailInfo.message) {
        setStatusMessage(
          `申請已發送！編號：${displayLabel}（已儲存至雲端；${emailInfo.message}）`,
        );
      } else {
        setStatusMessage(
          `申請已發送！編號：${displayLabel}（已儲存至雲端）`,
        );
      }

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

  const primaryScale =
    primaryLayer?.type === "text"
      ? primaryLayer.scale
      : primaryLayer?.type === "image"
        ? primaryLayer.scale
        : 1;
  const primaryRotation = primaryLayer?.rotation ?? 0;
  const primaryLocked = primaryLayer?.locked ?? false;

  const handleDeletePrimary = useCallback(() => {
    if (!primaryId) return;
    deleteLayerById(primaryId);
  }, [primaryId, deleteLayerById]);

  return (
    <div className="flex h-full flex-col bg-zinc-50 text-zinc-900">
      <div className="flex min-h-0 flex-1">
        <IconNav active={activeTab} onChange={setActiveTab} />

        {activeTab === "product" && (
          <ProductPanel
            product={product}
            shirtColor={shirtColor}
            material={material}
            size={size}
            onProductChange={setProduct}
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
          primaryLayer={primaryLayer}
          scale={primaryScale}
          rotation={primaryRotation}
          primaryLocked={primaryLocked}
          selectedText={selectedText}
          isBusy={isBusy}
          showGrid={showGrid}
          gridSnapEnabled={gridSnapEnabled}
          elementSnapDistance={elementSnapDistance}
          warnings={warnings}
          onScaleChange={(v) => {
            if (primaryId) applyClampedLayerTransform(primaryId, { scale: v });
          }}
          onRotationChange={(v) => {
            if (primaryId) applyClampedLayerTransform(primaryId, { rotation: v });
          }}
          onReset={handleReset}
          onDeletePrimary={handleDeletePrimary}
          onTextChange={(patch) => {
            if (primaryId && primaryLayer?.type === "text") {
              updateLayer(primaryId, patch);
            }
          }}
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
          side={side}
          layers={layers}
          layersByTemplate={layersByTemplate}
          selectedIds={selectedIds}
          showGrid={showGrid}
          gridSnapEnabled={gridSnapEnabled}
          elementSnapDistance={elementSnapDistance}
          isBusy={isBusy}
          selectedText={selectedText}
          primaryLocked={primaryLocked}
          focusTextEditor={focusTextEditor}
          warnings={warnings}
          onSelectLayer={handleSelectLayer}
          onLayerTransformChange={(id, next) => {
            if (layers.find((l) => l.id === id)?.locked) return;
            applyClampedLayerTransform(id, next);
          }}
          onLayerRotationChange={(id, rotation) => {
            if (layers.find((l) => l.id === id)?.locked) return;
            applyClampedLayerTransform(id, { rotation });
          }}
          onClearSelection={() => setSelectedIds([])}
          onSideChange={setSide}
          onDuplicateLayer={(id) => void handleDuplicate(id)}
          onDeleteLayer={deleteLayerById}
          onMoveLayer={(id, action) => {
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
          onSave={() => void handleSave()}
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

      {isContestMode && contestSubmitted && contestSubmissionInfo && (
        <ContestSubmitSuccess
          submissionNo={contestSubmissionInfo.submissionNo}
          authorName={contestSubmissionInfo.authorName}
        />
      )}
    </div>
  );
}
