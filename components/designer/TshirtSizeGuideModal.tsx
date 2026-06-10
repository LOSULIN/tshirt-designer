"use client";

import { useEffect, useState } from "react";
import {
  TSHIRT_SIZE_GUIDE_MISSING_MESSAGE,
  TSHIRT_SIZE_GUIDE_PATH,
} from "@/lib/guides";

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2] as const;

export function TshirtSizeGuideModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [imageAvailable, setImageAvailable] = useState<boolean | null>(null);
  const [zoomIndex, setZoomIndex] = useState(1);
  const zoom = ZOOM_STEPS[zoomIndex];

  useEffect(() => {
    if (open) {
      setImageAvailable(null);
      setZoomIndex(1);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-max max-w-[90vw] flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="tshirt-size-guide-title"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 sm:px-5 sm:py-4">
          <h2
            id="tshirt-size-guide-title"
            className="text-base font-semibold text-zinc-900 sm:text-lg"
          >
            尺寸參考表
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="關閉"
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto overscroll-contain p-3 sm:p-5">
          {imageAvailable === false ? (
            <p className="py-8 text-center text-sm text-zinc-600">
              {TSHIRT_SIZE_GUIDE_MISSING_MESSAGE}
            </p>
          ) : (
            <div
              className="flex shrink-0 items-center justify-center"
              style={{
                transform: zoom === 1 ? undefined : `scale(${zoom})`,
                transformOrigin: "center center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={TSHIRT_SIZE_GUIDE_PATH}
                alt="T 恤尺寸參考表"
                className={`h-auto w-full max-w-[85vw] max-h-[65vh] object-contain rounded-lg border border-zinc-200 sm:max-w-[600px] sm:max-h-[70vh] ${
                  imageAvailable === null ? "opacity-0" : "opacity-100"
                }`}
                onLoad={() => setImageAvailable(true)}
                onError={() => setImageAvailable(false)}
              />
            </div>
          )}
        </div>

        {imageAvailable !== false && (
          <div className="flex shrink-0 items-center justify-between border-t border-zinc-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={zoomIndex === 0}
                onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50 disabled:opacity-40"
                aria-label="縮小"
              >
                −
              </button>
              <span className="min-w-[3rem] text-center text-xs text-zinc-600">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                disabled={zoomIndex === ZOOM_STEPS.length - 1}
                onClick={() =>
                  setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
                }
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50 disabled:opacity-40"
                aria-label="放大"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 sm:text-sm"
            >
              關閉
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
