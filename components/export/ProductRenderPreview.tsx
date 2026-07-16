"use client";

export interface ProductRenderPreviewProps {
  artworkUrl?: string | null;
  productUrl?: string | null;
  artworkLabel?: string;
  productLabel?: string;
}

export function ProductRenderPreview({
  artworkUrl,
  productUrl,
  artworkLabel = "Artwork Preview",
  productLabel = "商品圖 Preview",
}: ProductRenderPreviewProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <PreviewTile label={artworkLabel} src={artworkUrl} />
      <PreviewTile label={productLabel} src={productUrl} />
    </div>
  );
}

function PreviewTile({
  label,
  src,
}: {
  label: string;
  src?: string | null;
}) {
  return (
    <div className="flex min-h-[88px] flex-col rounded-lg border border-zinc-200 bg-zinc-50">
      <p className="border-b border-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600">
        {label}
      </p>
      <div className="flex flex-1 items-center justify-center p-2">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={label}
            className="max-h-20 max-w-full object-contain"
          />
        ) : (
          <span className="text-[10px] text-zinc-400">—</span>
        )}
      </div>
    </div>
  );
}
