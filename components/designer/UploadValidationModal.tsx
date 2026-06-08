"use client";

export function UploadValidationModal({
  open,
  detail,
  onClose,
}: {
  open: boolean;
  detail?: string | null;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="upload-error-title"
        aria-describedby="upload-error-desc"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl text-red-600">
          !
        </div>
        <h2
          id="upload-error-title"
          className="text-center text-lg font-semibold text-zinc-900"
        >
          格式不符
        </h2>
        <p
          id="upload-error-desc"
          className="mt-2 text-center text-sm text-zinc-900"
        >
          請重新上傳
        </p>
        {detail && (
          <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-900">
            {detail}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
