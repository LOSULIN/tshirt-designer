"use client";

export interface RenderResultCardProps {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  canvas?: HTMLCanvasElement | null;
  emptyLabel?: string;
}

function canvasToUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

export function RenderResultCard({
  title,
  subtitle,
  imageUrl,
  canvas,
  emptyLabel = "—",
}: RenderResultCardProps) {
  const src = canvas ? canvasToUrl(canvas) : imageUrl;

  return (
    <article className="flex min-h-[280px] flex-col rounded-xl border border-zinc-200 bg-white shadow-sm">
      <header className="border-b border-zinc-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
        ) : null}
      </header>
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-3">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={title}
            className="max-h-[320px] max-w-full object-contain"
          />
        ) : (
          <span className="text-sm text-zinc-400">{emptyLabel}</span>
        )}
      </div>
    </article>
  );
}
