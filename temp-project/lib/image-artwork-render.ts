import {
  resolveImageArtworkBounds,
} from "./image-bounds";
import type { ImageArtworkBoundsPx } from "./types";
import type { UploadedDesignImage } from "./types";

export interface ArtworkCropSourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface ArtworkPreviewDomStyle {
  position: "absolute";
  width: string;
  height: string;
  left: string;
  top: string;
}

export function getArtworkCropSourceRect(
  image: UploadedDesignImage,
  imgNaturalWidth: number,
  imgNaturalHeight: number,
): ArtworkCropSourceRect {
  const bounds = resolveImageArtworkBounds(image);
  const scaleX =
    image.naturalWidth > 0 ? imgNaturalWidth / image.naturalWidth : 1;
  const scaleY =
    image.naturalHeight > 0 ? imgNaturalHeight / image.naturalHeight : 1;

  return {
    sx: bounds.minX * scaleX,
    sy: bounds.minY * scaleY,
    sw: bounds.visibleWidth * scaleX,
    sh: bounds.visibleHeight * scaleY,
  };
}

export function isFullCanvasArtworkBounds(
  bounds: ImageArtworkBoundsPx,
  naturalWidth: number,
  naturalHeight: number,
): boolean {
  return (
    bounds.minX === 0 &&
    bounds.minY === 0 &&
    bounds.visibleWidth === naturalWidth &&
    bounds.visibleHeight === naturalHeight
  );
}

export function getArtworkPreviewDomStyle(
  image: UploadedDesignImage,
): ArtworkPreviewDomStyle | null {
  const bounds = resolveImageArtworkBounds(image);
  if (isFullCanvasArtworkBounds(bounds, image.naturalWidth, image.naturalHeight)) {
    return null;
  }

  const vw = bounds.visibleWidth;
  const vh = bounds.visibleHeight;
  const scaleX = image.naturalWidth / vw;
  const scaleY = image.naturalHeight / vh;

  return {
    position: "absolute",
    width: `${scaleX * 100}%`,
    height: `${scaleY * 100}%`,
    left: `${-(bounds.minX / vw) * 100}%`,
    top: `${-(bounds.minY / vh) * 100}%`,
  };
}

export function drawImageArtworkOnCanvas(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  image: UploadedDesignImage,
  imgNaturalWidth: number,
  imgNaturalHeight: number,
  destX: number,
  destY: number,
  destWidth: number,
  destHeight: number,
) {
  const { sx, sy, sw, sh } = getArtworkCropSourceRect(
    image,
    imgNaturalWidth,
    imgNaturalHeight,
  );
  ctx.drawImage(img, sx, sy, sw, sh, destX, destY, destWidth, destHeight);
}
