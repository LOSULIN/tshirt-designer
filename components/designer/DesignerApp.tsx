"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DesignCanvas } from "./DesignCanvas";
import { TemplateSidebar } from "./TemplateSidebar";
import { ToolsSidebar } from "./ToolsSidebar";
import type { Gender, Side } from "@/lib/constants";
import { DRAFT_TTL_MS, PRINT_AREA } from "@/lib/constants";
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
  createImageLayer,
  defaultLayerName,
  duplicateImageLayerAsync,
  duplicateTextLayer,
  getNextZIndex,
  migrateLegacyToLayers,
  layersToDraftSnapshot,
  moveLayerZIndex,
  reorderLayersByDrag,
  revokeLayerAssets,
} from "@/lib/layers";
import { buildSnapTargetsFromLayers } from "@/lib/snap-targets";
import {
  createPreviewFromFile,
  isUpscaledBeyondOriginal,
  validateImageFile,
  validateImageFileFull,
} from "@/lib/image-processing";
import type {
  DesignLayer,
  ImageDesignLayer,
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

export function DesignerApp() {
  const [gender, setGender] = useState<Gender>("male");
  const [side, setSide] = useState<Side>("front");
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
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const primaryId = selectedIds[selectedIds.length - 1] ?? null;
  const primaryLayer = layers.find((l) => l.id === primaryId) ?? null;

  const hasDesign = layers.length > 0;
  const selectedText =
    primaryLayer?.type === "text" ? primaryLayer : null;

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
    setGender(meta.config.templateType);
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
      formData.append("designJson", buildDesignJson(gender, side, layers));
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
  }, [draftId, gender, side, hasDesign, layers]);

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      void persistDraftLocally();
      void syncDraftToServer();
    }, 30000);
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [persistDraftLocally, syncDraftToServer]);

  const handleUpload = async (file: File) => {
    setStatusMessage(null);
    const basic = validateImageFile(file);
    if (!basic.ok) {
      setWarnings([basic.error]);
      return;
    }

    setIsBusy(true);
    try {
      const full = await validateImageFileFull(file);
      if (!full.ok) {
        setWarnings([full.error]);
        return;
      }

      const preview = await createPreviewFromFile(file);
      const placement = getInitialPlacement(
        preview.previewWidth,
        preview.previewHeight,
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
      if (full.lowResolution) {
        msgs.push("圖片解析度不足，可能影響印刷品質");
      }
      if (full.belowRecommended) {
        msgs.push("建議使用 3000px 以上解析度以獲得最佳印刷效果");
      }
      if (!full.isPng) {
        setJpgHintShown(true);
        msgs.push("建議使用透明背景PNG獲得最佳印刷效果");
      }
      setWarnings(msgs);
      setStatusMessage("圖片已上傳，可拖曳、縮放與旋轉");
    } catch (error) {
      setWarnings([
        error instanceof Error ? error.message : "上傳失敗",
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddText = () => {
    const layer = createDefaultTextDesignLayer(layers);
    setLayers((prev) => [...prev, layer]);
    setSelectedIds([layer.id]);
    setStatusMessage("已新增文字圖層");
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
      primaryLayer.image.previewWidth,
      primaryLayer.image.previewHeight,
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

  const handleDeletePrimary = () => {
    if (!primaryId) return;
    deleteLayerById(primaryId);
    if (layers.length <= 1) {
      setWarnings([]);
      setJpgHintShown(false);
      void clearAllDrafts();
    }
    setStatusMessage("已刪除圖層");
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
      setStatusMessage("設計已儲存（含圖層順序、名稱與狀態）");
    } catch (error) {
      setWarnings([
        error instanceof Error ? error.message : "儲存失敗",
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!hasDesign) return;
    setIsBusy(true);
    setStatusMessage(null);
    try {
      const completedBlob = await renderCompletedDesignPng(gender, side, layers);
      const designJson = buildDesignJson(gender, side, layers);
      const textJson = buildTextJson(layers);

      const formData = new FormData();
      formData.append("completed", completedBlob, "completed.png");
      formData.append("designJson", designJson);
      formData.append("textJson", textJson);

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

      setStatusMessage(
        `設計已送出！編號：${data.designId}（${data.createdAt}）`,
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

  const primaryScale =
    primaryLayer?.type === "text"
      ? primaryLayer.scale
      : primaryLayer?.type === "image"
        ? primaryLayer.scale
        : 1;
  const primaryRotation = primaryLayer?.rotation ?? 0;
  const primaryLocked = primaryLayer?.locked ?? false;

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      <header className="shrink-0 border-b border-zinc-200 bg-white px-6 py-4 shadow-sm">
        <h1 className="text-lg font-semibold text-zinc-900">
          服飾客製化設計器
        </h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <TemplateSidebar
          gender={gender}
          side={side}
          onGenderChange={(g) => {
            setGender(g);
            setStatusMessage(null);
          }}
          onSideChange={(s) => {
            setSide(s);
            setStatusMessage(null);
          }}
        />

        <DesignCanvas
          gender={gender}
          side={side}
          layers={layers}
          selectedIds={selectedIds}
          showGrid={showGrid}
          gridSnapEnabled={gridSnapEnabled}
          elementSnapDistance={elementSnapDistance}
          onSelectLayer={handleSelectLayer}
          onLayerTransformChange={(id, next) => {
            if (layers.find((l) => l.id === id)?.locked) return;
            applyClampedLayerTransform(id, next);
          }}
          onClearSelection={() => setSelectedIds([])}
        />

        <ToolsSidebar
          layers={layers}
          selectedIds={selectedIds}
          primaryLayer={primaryLayer}
          scale={primaryScale}
          rotation={primaryRotation}
          primaryLocked={primaryLocked}
          hasDesign={hasDesign}
          selectedText={selectedText}
          showGrid={showGrid}
          gridSnapEnabled={gridSnapEnabled}
          onShowGridChange={setShowGrid}
          onGridSnapChange={setGridSnapEnabled}
          elementSnapDistance={elementSnapDistance}
          onElementSnapDistanceChange={setElementSnapDistance}
          warnings={warnings}
          statusMessage={statusMessage}
          isBusy={isBusy}
          onUpload={handleUpload}
          onAddText={handleAddText}
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
          onSave={() => void handleSave()}
          onSubmit={() => void handleSubmit()}
        />
      </div>
    </div>
  );
}
