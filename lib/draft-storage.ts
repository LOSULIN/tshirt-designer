import {
  DESIGNER_MODE_DEFAULT,
  getDraftStorageConfig,
  type DesignerMode,
  type DraftStorageConfig,
} from "./designer-mode";
import { DRAFT_DB_VERSION } from "./constants";
import { DESIGN_GENDERS, DESIGN_SIDES, getLayersForSlot } from "./design-state";
import type { DesignDraft, DesignLayer, DesignLayersByTemplate } from "./types";

const IMAGE_KEY = "original";
const PREVIEW_KEY = "preview";

function layerOriginalKey(id: string) {
  return `layer-${id}-original`;
}

function layerPreviewKey(id: string) {
  return `layer-${id}-preview`;
}

function ensureObjectStore(db: IDBDatabase, storeName: string) {
  if (!db.objectStoreNames.contains(storeName)) {
    db.createObjectStore(storeName);
  }
}

function createScopedDraftStorage(config: DraftStorageConfig) {
  function openDbAtVersion(version: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(config.dbName, version);
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn(
          `[draft-storage] IndexedDB upgrade blocked for ${config.dbName}`,
        );
      };
      request.onupgradeneeded = () => {
        ensureObjectStore(request.result, config.storeName);
      };
      request.onsuccess = () => {
        const db = request.result;
        if (db.objectStoreNames.contains(config.storeName)) {
          resolve(db);
          return;
        }

        db.close();
        if (version >= DRAFT_DB_VERSION + 1) {
          reject(
            new Error(
              `IndexedDB object store "${config.storeName}" is missing in ${config.dbName}`,
            ),
          );
          return;
        }

        openDbAtVersion(version + 1).then(resolve, reject);
      };
    });
  }

  function openDb(): Promise<IDBDatabase> {
    return openDbAtVersion(DRAFT_DB_VERSION);
  }

  async function putBlob(key: string, blob: Blob) {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(config.storeName, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(config.storeName).put(blob, key);
    });
    db.close();
  }

  async function getBlob(key: string): Promise<Blob | null> {
    const db = await openDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(config.storeName, "readonly");
      const request = tx.objectStore(config.storeName).get(key);
      request.onsuccess = () => resolve((request.result as Blob) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return blob;
  }

  async function deleteBlob(key: string) {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(config.storeName, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(config.storeName).delete(key);
    });
    db.close();
  }

  async function saveDraftImages(original: Blob, preview: Blob) {
    await Promise.all([putBlob(IMAGE_KEY, original), putBlob(PREVIEW_KEY, preview)]);
  }

  async function loadDraftImages(): Promise<{
    original: Blob | null;
    preview: Blob | null;
  }> {
    const [original, preview] = await Promise.all([
      getBlob(IMAGE_KEY),
      getBlob(PREVIEW_KEY),
    ]);
    return { original, preview };
  }

  async function saveLayerImages(layerId: string, original: Blob, preview: Blob) {
    await Promise.all([
      putBlob(layerOriginalKey(layerId), original),
      putBlob(layerPreviewKey(layerId), preview),
    ]);
  }

  async function loadLayerImages(layerId: string): Promise<{
    original: Blob | null;
    preview: Blob | null;
  }> {
    const [original, preview] = await Promise.all([
      getBlob(layerOriginalKey(layerId)),
      getBlob(layerPreviewKey(layerId)),
    ]);
    return { original, preview };
  }

  async function saveAllLayerImages(layers: DesignLayer[]) {
    const imageLayers = layers.filter((l) => l.type === "image");
    for (const layer of imageLayers) {
      if (layer.type !== "image") continue;
      const previewBlob = await fetch(layer.image.previewUrl).then((r) => r.blob());
      await saveLayerImages(layer.id, layer.image.originalBlob, previewBlob);
    }

    const first = imageLayers[0];
    if (first && first.type === "image") {
      const previewBlob = await fetch(first.image.previewUrl).then((r) => r.blob());
      await saveDraftImages(first.image.originalBlob, previewBlob);
    }
  }

  async function saveAllLayerImagesFromState(layersByTemplate: DesignLayersByTemplate) {
    let firstImageLayer: Extract<DesignLayer, { type: "image" }> | null = null;

    for (const gender of DESIGN_GENDERS) {
      for (const side of DESIGN_SIDES) {
        for (const layer of getLayersForSlot(layersByTemplate, gender, side)) {
          if (layer.type !== "image") continue;
          const previewBlob = await fetch(layer.image.previewUrl).then((r) => r.blob());
          await saveLayerImages(layer.id, layer.image.originalBlob, previewBlob);
          if (!firstImageLayer) firstImageLayer = layer;
        }
      }
    }

    if (firstImageLayer) {
      const previewBlob = await fetch(firstImageLayer.image.previewUrl).then((r) =>
        r.blob(),
      );
      await saveDraftImages(firstImageLayer.image.originalBlob, previewBlob);
    }
  }

  async function clearDraftImages() {
    await Promise.all([deleteBlob(IMAGE_KEY), deleteBlob(PREVIEW_KEY)]);
  }

  async function clearLayerImages(layerId: string) {
    await Promise.all([
      deleteBlob(layerOriginalKey(layerId)),
      deleteBlob(layerPreviewKey(layerId)),
    ]);
  }

  function saveDraftMetadata(draft: DesignDraft) {
    localStorage.setItem(config.storageKey, JSON.stringify(draft));
  }

  function loadDraftMetadata(): DesignDraft | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(config.storageKey);
    if (!raw) return null;
    try {
      const draft = JSON.parse(raw) as DesignDraft;
      if (draft.submitted) return null;
      if (new Date(draft.expiresAt).getTime() < Date.now()) {
        clearDraftMetadata();
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  }

  function clearDraftMetadata() {
    localStorage.removeItem(config.storageKey);
  }

  async function clearAllDrafts() {
    clearDraftMetadata();
    await clearDraftImages();
  }

  return {
    saveDraftImages,
    loadDraftImages,
    saveLayerImages,
    loadLayerImages,
    saveAllLayerImages,
    saveAllLayerImagesFromState,
    clearDraftImages,
    clearLayerImages,
    saveDraftMetadata,
    loadDraftMetadata,
    clearDraftMetadata,
    clearAllDrafts,
  };
}

export type DraftStorage = ReturnType<typeof createScopedDraftStorage>;

export function createDraftStorage(mode: DesignerMode = DESIGNER_MODE_DEFAULT): DraftStorage {
  return createScopedDraftStorage(getDraftStorageConfig(mode));
}

const normalDraftStorage = createDraftStorage("normal");

export const saveDraftImages = normalDraftStorage.saveDraftImages;
export const loadDraftImages = normalDraftStorage.loadDraftImages;
export const saveLayerImages = normalDraftStorage.saveLayerImages;
export const loadLayerImages = normalDraftStorage.loadLayerImages;
export const saveAllLayerImages = normalDraftStorage.saveAllLayerImages;
export const saveAllLayerImagesFromState = normalDraftStorage.saveAllLayerImagesFromState;
export const clearDraftImages = normalDraftStorage.clearDraftImages;
export const clearLayerImages = normalDraftStorage.clearLayerImages;
export const saveDraftMetadata = normalDraftStorage.saveDraftMetadata;
export const loadDraftMetadata = normalDraftStorage.loadDraftMetadata;
export const clearDraftMetadata = normalDraftStorage.clearDraftMetadata;
export const clearAllDrafts = normalDraftStorage.clearAllDrafts;
