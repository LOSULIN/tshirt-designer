"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  normalizeGender,
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
  saveAllLayerImages,
  saveDraftMetadata,
} from "@/lib/draft-storage";
import {
  buildDesignJson,
  buildTextJson,
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
  migrateLegacyToLayers,
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

  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
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

  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const primaryLayer = layers.find((l) => l.id === primaryId) ?? null;
  const hasDesign = layers.length > 0;
  const selectedText =
    primaryLayer?.type === "text" ? primaryLayer : null;

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
    [],
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
    [gridSnapEnabled, elementSnapDistance],
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

  const deleteLayerById = useCallback((id: string) => {
    setLayers((prev) => {
      const target = prev.find((l) => l.id === id);
      if (target) revokeLayerAssets(target);
      void clearLayerImages(id);
      return prev.filter((l) => l.id !== id);
    });
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const restoreDraft = useCallback(async () => {
    const meta = loadDraftMetadata();
    if (!meta) return;

    setDraftId(meta.id);
    setGender(normalizeGender(meta.config.templateType));
    setSide(meta.config.side);

    let restored: DesignLayer[] = [];

    if (meta.layers?.length) {
      restored = meta.layers;
      const hydrated: DesignLayer[] = [];
      for (const layer of restored) {
        if (layer.type === "image") {
          let blobs = await loadLayerImages(layer.id);
          if (!blobs.original || !blobs.preview) {
            blobs = await loadDraftImages();
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
      restored = hydrated;
    } else {
      const images = await loadDraftImages();
      let imageData: UploadedDesignImage | null = null;
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
        imageData = {
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
      restored = migrateLegacyToLayers(
        meta.config,
        imageData,
        meta.textLayers ?? [],
      );
    }

    if (restored.length > 0) {
      setLayers(restored);
      setStatusMessage("已恢復未送出的暫存設計");
    }
  }, []);

  useEffect(() => {
    void restoreDraft();
  }, [restoreDraft]);

  const persistDraftLocally = useCallback(async () => {
    if (!hasDesign) return;

    const expiresAt = new Date(Date.now() + DRAFT_TTL_MS).toISOString();
    const firstImage = layers.find((l) => l.type === "image");

    saveDraftMetadata({
      id: draftId,
      savedAt: new Date().toISOString(),
      expiresAt,
      submitted: false,
      config: {
        templateType: gender,
        side,
        x: firstImage?.x ?? 0,
        y: firstImage?.y ?? 0,
        width: firstImage?.width ?? 0,
        height: firstImage?.height ?? 0,
        scale: firstImage?.scale ?? 1,
        rotation: firstImage?.rotation ?? 0,
      },
      hasImage: !!firstImage,
      layers: layersToDraftSnapshot(layers),
    });

    await saveAllLayerImages(layers);
  }, [draftId, gender, side, hasDesign, layers]);

  const syncDraftToServer = useCallback(async () => {
    if (!hasDesign) return;
    try {
      const formData = new FormData();
      formData.append("draftId", draftId);
      formData.append(
        "designJson",
        buildDesignJson(gender, side, layers, submissionMeta),
      );
      formData.append("textJson", buildTextJson(layers));
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
      await fetch("/api/designs/draft", { method: "POST", body: formData });
    } catch {
      // 離線或尚未設定 Supabase 時仍保留本機暫存
    }
  }, [draftId, gender, side, hasDesign, layers, submissionMeta]);

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      void persistDraftLocally();
      void syncDraftToServer();
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

  const handleClearAllDesign = useCallback(() => {
    for (const layer of layers) {
      revokeLayerAssets(layer);
      void clearLayerImages(layer.id);
    }
    setLayers([]);
    setSelectedIds([]);
    setWarnings([]);
    setJpgHintShown(false);
    setFocusTextEditor(false);
    void clearAllDrafts();
    setDraftId(nanoid(12));
    setStatusMessage("已清除全部設計，可重新開始");
  }, [layers]);

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
    try {
      await persistDraftLocally();
      await syncDraftToServer();
      setStatusMessage("設計已儲存");
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
      const completedBlob = await renderCompletedDesignPng(gender, side, layers);
      const designJson = buildDesignJson(gender, side, layers, {
        ...submissionMeta,
        applicant: applicationForm,
      });
      const textJson = buildTextJson(layers);

      const formData = new FormData();
      formData.append("completed", completedBlob, "completed.png");
      formData.append("designJson", designJson);
      formData.append("textJson", textJson);
      formData.append("applicantJson", JSON.stringify(applicationForm));

      const firstImage = layers.find(
        (l): l is ImageDesignLayer => l.type === "image",
      );
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
        config: {
          templateType: gender,
          side,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          scale: 1,
          rotation: 0,
        },
        hasImage: !!firstImage,
        layers: layersToDraftSnapshot(layers),
      });

      setShowSubmitModal(false);
      setApplicationForm(EMPTY_FORM);
      setStatusMessage(
        `申請已發送！編號：${data.designId}（已寄送 Email 並儲存至雲端）`,
      );
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
    if (layers.length <= 1) {
      setWarnings([]);
      setJpgHintShown(false);
      void clearAllDrafts();
    }
    setStatusMessage("已刪除圖層");
  }, [primaryId, layers.length, deleteLayerById]);

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
