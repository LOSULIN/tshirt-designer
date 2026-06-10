"use client";

export function DesignToolbar({
  isBusy,
  warnings,
  onUpload,
  onAddText,
}: {
  isBusy: boolean;
  warnings: string[];
  onUpload: (file: File) => void;
  onAddText: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-zinc-200 bg-white px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-100">
          <span>🖼️</span>
          <span>上傳圖片</span>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
            disabled={isBusy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          disabled={isBusy}
          onClick={onAddText}
          className="flex items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
        >
          <span className="font-serif">T</span>
          <span>新增文字</span>
        </button>
        <p className="text-[10px] text-zinc-500">
          選取後用工具列 ⋮⋮ 拖曳 · +/− 縮放 · 雙擊編輯文字
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {warnings.map((w) => (
            <p
              key={w}
              className="rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-800"
            >
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
