import { DRAFT_DB_NAME, DRAFT_STORAGE_KEY, DRAFT_STORE_NAME } from "./constants";
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

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DRAFT_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        db.createObjectStore(DRAFT_STORE_NAME);
      }
    };
  });
}

async function putBlob(key: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(DRAFT_STORE_NAME).put(blob, key);
  });
  db.close();
}

async function getBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE_NAME, "readonly");
    const request = tx.objectStore(DRAFT_STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as Blob) ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return blob;
}

async function deleteBlob(key: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE_NAME, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(DRAFT_STORE_NAME).delete(key);
  });
  db.close();
}

export async function saveDraftImages(original: Blob, preview: Blob) {
  await Promise.all([
    putBlob(IMAGE_KEY, original),
    putBlob(PREVIEW_KEY, preview),
  ]);
}

export async function loadDraftImages(): Promise<{
  original: Blob | null;
  preview: Blob | null;
}> {
  const [original, preview] = await Promise.all([
    getBlob(IMAGE_KEY),
    getBlob(PREVIEW_KEY),
  ]);
  return { original, preview };
}

export async function saveLayerImages(
  layerId: string,
  original: Blob,
  preview: Blob,
) {
  await Promise.all([
    putBlob(layerOriginalKey(layerId), original),
    putBlob(layerPreviewKey(layerId), preview),
  ]);
}

export async function loadLayerImages(layerId: string): Promise<{
  original: Blob | null;
  preview: Blob | null;
}> {
  const [original, preview] = await Promise.all([
    getBlob(layerOriginalKey(layerId)),
    getBlob(layerPreviewKey(layerId)),
  ]);
  return { original, preview };
}

export async function saveAllLayerImages(layers: DesignLayer[]) {
  const imageLayers = layers.filter((l) => l.type === "image");
  for (const layer of imageLayers) {
    if (layer.type !== "image") continue;
    const previewBlob = await fetch(layer.image.previewUrl).then((r) =>
      r.blob(),
    );
    await saveLayerImages(layer.id, layer.image.originalBlob, previewBlob);
  }

  const first = imageLayers[0];
  if (first && first.type === "image") {
    const previewBlob = await fetch(first.image.previewUrl).then((r) =>
      r.blob(),
    );
    await saveDraftImages(first.image.originalBlob, previewBlob);
  }
}

export async function saveAllLayerImagesFromState(
  layersByTemplate: DesignLayersByTemplate,
) {
  let firstImageLayer: Extract<DesignLayer, { type: "image" }> | null = null;

  for (const gender of DESIGN_GENDERS) {
    for (const side of DESIGN_SIDES) {
      for (const layer of getLayersForSlot(layersByTemplate, gender, side)) {
        if (layer.type !== "image") continue;
        const previewBlob = await fetch(layer.image.previewUrl).then((r) =>
          r.blob(),
        );
        await saveLayerImages(layer.id, layer.image.originalBlob, previewBlob);
        if (!firstImageLayer) firstImageLayer = layer;
      }
    }
  }

  if (firstImageLayer) {
    const previewBlob = await fetch(firstImageLayer.image.previewUrl).then(
      (r) => r.blob(),
    );
    await saveDraftImages(
      firstImageLayer.image.originalBlob,
      previewBlob,
    );
  }
}

export async function clearDraftImages() {
  await Promise.all([deleteBlob(IMAGE_KEY), deleteBlob(PREVIEW_KEY)]);
}

export async function clearLayerImages(layerId: string) {
  await Promise.all([
    deleteBlob(layerOriginalKey(layerId)),
    deleteBlob(layerPreviewKey(layerId)),
  ]);
}

export function saveDraftMetadata(draft: DesignDraft) {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function loadDraftMetadata(): DesignDraft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
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

export function clearDraftMetadata() {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export async function clearAllDrafts() {
  clearDraftMetadata();
  await clearDraftImages();
}
