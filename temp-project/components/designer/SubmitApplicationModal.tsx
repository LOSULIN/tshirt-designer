"use client";

import type { ApplicationFormData } from "@/lib/types";

export function SubmitApplicationModal({
  open,
  isBusy,
  form,
  onChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  isBusy: boolean;
  form: ApplicationFormData;
  onChange: (patch: Partial<ApplicationFormData>) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  const canSubmit =
    form.applicantName.trim().length > 0 &&
    form.applicantEmail.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">發送設計申請</h2>
        <p className="mt-1 text-sm text-zinc-900">
          填寫聯絡資訊後，系統將寄送 Email 通知並將設計檔案儲存至雲端硬碟。
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-900">姓名 *</label>
            <input
              type="text"
              value={form.applicantName}
              disabled={isBusy}
              onChange={(e) => onChange({ applicantName: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-900">Email *</label>
            <input
              type="email"
              value={form.applicantEmail}
              disabled={isBusy}
              onChange={(e) => onChange({ applicantEmail: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-900">電話</label>
            <input
              type="tel"
              value={form.applicantPhone}
              disabled={isBusy}
              onChange={(e) => onChange({ applicantPhone: e.target.value })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-900">備註</label>
            <textarea
              value={form.notes}
              disabled={isBusy}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              placeholder="特殊需求或說明..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={isBusy || !canSubmit}
            onClick={onConfirm}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {isBusy ? "發送中..." : "確認發送"}
          </button>
        </div>
      </div>
    </div>
  );
}
