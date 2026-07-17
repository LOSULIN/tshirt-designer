/**
 * Module-level image decode cache — keyed by image URL.
 * Reuses decoded HTMLImageElement across mockup / print export passes.
 */

const imageCache = new Map<string, HTMLImageElement>();
const pendingLoads = new Map<string, Promise<HTMLImageElement>>();

export function loadCachedImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = pendingLoads.get(src);
  if (pending) {
    return pending;
  }

  const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      pendingLoads.delete(src);
      resolve(img);
    };
    img.onerror = () => {
      pendingLoads.delete(src);
      reject(new Error("無法載入圖片"));
    };
    img.src = src;
  });

  pendingLoads.set(src, loadPromise);
  return loadPromise;
}

export function clearImageCache(): void {
  imageCache.clear();
  pendingLoads.clear();
}
