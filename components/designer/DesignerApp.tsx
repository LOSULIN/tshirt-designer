"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "./AppHeader";
import { DesignCanvas } from "./DesignCanvas";
import { DesignPanel } from "./DesignPanel";
import { IconNav } from "./IconNav";
import { ModelPanel } from "./ModelPanel";
import { ProductPanel } from "./ProductPanel";
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
  PRINT_AREA,
  PRODUCTS,
  RECOMMENDED_IMAGE_HEIGHT,
  RECOMMENDED_IMAGE_WIDTH,
  suggestSize,
} from "@/lib/constants";
import {
  clearAllDrafts,
  clearLayerImages,
  loadDraftImages,
  loadDraftMetadata,
  loadLayerImages,
  saveAllLayerImagesFromState,
  saveDraftMetadata,
} from "@/lib/draft-storage";
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
  buildFullDesignJson,
  renderCompletedDesignPng,
} from "@/lib/export-design";
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

function withMeasuredTextLayer(layer: TextDesignLayer): TextDesignLayer {
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
  );
  return { ...layer, width, height, x: clamped.x, y: clamped.y };
}

function createDefaultTextDesignLayer(layers: DesignLayer[]): TextDesignLayer {
  const base = createDefaultTextLayer();
  return withMeasuredTextLayer({
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
  });
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
) {
  let result = createEmptyDesignLayersByTemplate();
  let legacyDraftImagesUsed = false;

  for (const templateGender of DESIGN_GENDERS) {
    for (const templateSide of DESIGN_SIDES) {
      const hydrated: DesignLayer[] = [];

      for (const layer of getLayersForSlot(snapshot, templateGender, templateSide)) {
        if (layer.type === "image") {
          let blobs = await loadLayerImages(layer.id);
          if ((!blobs.original || !blobs.preview) && !legacyDraftImagesUsed) {
            const legacy = await loadDraftImages();
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

export function DesignerApp() {
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
  const [uploadAlertDetail, setUploadAlertDetail] = useState<string | null>(
    null,
  );
  const [focusTextEditor, setFocusTextEditor] = useState(false);
  const [applicationForm, setApplicationForm] =
    useState<ApplicationFormData>(EMPTY_FORM);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const layers = useMemo(
    () => getLayersForSlot(layersByTemplate, gender, side),
    [layersByTemplate, gender, side],
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
            ? withMeasuredTextLayer(merged)
            : merged;
        }),
      );
    },
    [setLayers],
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

          const snap = applyDragSnap(nextX, nextY, w, h, layerScale, {
            gridSnap: gridSnapEnabled,
            elementSnap: true,
            elementSnapThreshold: elementSnapDistance,
            otherElements: buildSnapTargetsFromLayers(
              id,
              prev.filter((l) => l.visible && !l.locked),
            ),
          });

          const clamped = clampPositionToPrintArea(
            snap.x,
            snap.y,
            w,
            h,
            layerScale,
            nextRotation,
          );

          if (layer.type === "text") {
            return withMeasuredTextLayer({
              ...layer,
              x: clamped.x,
              y: clamped.y,
              scale: textScale,
              rotation: nextRotation,
            });
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
    [setLayers, gridSnapEnabled, elementSnapDistance],
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
          void clearLayerImages(id);
        }
        const next = updateLayersForSlot(prev, gender, side, (current) =>
          current.filter((l) => l.id !== id),
        );
        if (!hasAnyDesign(next)) {
          setWarnings([]);
          setJpgHintShown(false);
          void clearAllDrafts();
        }
        return next;
      });
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      setStatusMessage("已刪除圖層");
    },
    [gender, side],
  );

  const restoreDraft = useCallback(async () => {
    const meta = loadDraftMetadata();
    if (!meta) return;

    setDraftId(meta.id);

    let legacyImage: UploadedDesignImage | null = null;
    if (!meta.layersByTemplate && !meta.layers?.length) {
      const images = await loadDraftImages();
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
    );

    if (hasAnyDesign(hydrated)) {
      setLayersByTemplate(hydrated);
      setStatusMessage("已恢復未送出的暫存設計");
    }
  }, []);

  useEffect(() => {
    void restoreDraft();
  }, [restoreDraft]);

  const persistDraftLocally = useCallback(async () => {
    if (!hasDesign) return;

    const expiresAt = new Date(Date.now() + DRAFT_TTL_MS).toISOString();
    const activeConfig = legacyConfigFromSlot(layersByTemplate, gender, side);
    const firstImage = layers.find((l) => l.type === "image");

    saveDraftMetadata({
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

    await saveAllLayerImagesFromState(layersByTemplate);
  }, [draftId, gender, side, hasDesign, layers, layersByTemplate]);

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
          `建議使用 ${RECOMMENDED_IMAGE_WIDTH}×${RECOMMENDED_IMAGE_HEIGHT} 以獲得最佳印刷效果`,
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
        void clearLayerImages(layer.id);
      }
      const next = setLayersForSlot(prev, gender, side, []);
      if (!hasAnyDesign(next)) {
        void clearAllDrafts();
        setDraftId(nanoid(12));
      }
      return next;
    });
    setSelectedIds([]);
    setWarnings([]);
    setJpgHintShown(false);
    setFocusTextEditor(false);
    setStatusMessage("已清除目前面向設計");
  }, [gender, side]);

  const handleClearAllDesign = useCallback(() => {
    for (const templateGender of DESIGN_GENDERS) {
      for (const templateSide of DESIGN_SIDES) {
        for (const layer of getLayersForSlot(
          layersByTemplate,
          templateGender,
          templateSide,
        )) {
          revokeLayerAssets(layer);
          void clearLayerImages(layer.id);
        }
      }
    }
    setLayersByTemplate(createEmptyDesignLayersByTemplate());
    setSelectedIds([]);
    setWarnings([]);
    setJpgHintShown(false);
    setFocusTextEditor(false);
    void clearAllDrafts();
    setDraftId(nanoid(12));
    setStatusMessage("已清除全部設計，可重新開始");
  }, [layersByTemplate]);

  const handleAddText = () => {
    if (!canAddTextLayer(layers)) {
      setWarnings([textLayerLimitMessage()]);
      return;
    }

    const layer = createDefaultTextDesignLayer(layers);
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
        x: (PRINT_AREA.width - w) / 2,
        y: (PRINT_AREA.height - h) / 2,
      });
      return;
    }

    const placement = getInitialPlacement(
      primaryLayer.image.naturalWidth,
      primaryLayer.image.naturalHeight,
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
    setShowSubmitModal(true);
  };

  const handleSubmitConfirm = async () => {
    setIsBusy(true);
    setStatusMessage(null);
    try {
      const designJson = buildFullDesignJson(layersByTemplate, gender, side, {
        ...submissionMeta,
        applicant: applicationForm,
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
      formData.append("applicantJson", JSON.stringify(applicationForm));

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

      saveDraftMetadata({
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
      setApplicationForm(EMPTY_FORM);
      setCloudSyncWarning(null);

      const emailInfo = data.email as
        | { sent: true }
        | { sent: false; message?: string }
        | undefined;

      if (emailInfo?.sent) {
        setStatusMessage(
          `申請已發送！編號：${data.designId}（已儲存至雲端並寄送 Email 通知）`,
        );
      } else if (emailInfo && !emailInfo.sent && emailInfo.message) {
        setStatusMessage(
          `申請已發送！編號：${data.designId}（已儲存至雲端；${emailInfo.message}）`,
        );
      } else {
        setStatusMessage(
          `申請已發送！編號：${data.designId}（已儲存至雲端）`,
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
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-900">
      <AppHeader />

      <div className="flex min-h-0 flex-1">
        <IconNav active={activeTab} onChange={setActiveTab} />

        {activeTab === "product" && (
          <ProductPanel
            product={product}
            shirtColor={shirtColor}
            material={material}
            size={size}
            onProductChange={setProduct}
            onColorChange={setShirtColor}
            onMaterialChange={setMaterial}
            onSizeChange={setSize}
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

      <UploadValidationModal
        open={uploadAlertDetail !== null}
        detail={uploadAlertDetail}
        onClose={() => setUploadAlertDetail(null)}
      />
    </div>
  );
}
