"use client";

import { useState } from "react";
import {
  validateContestSubmissionForm,
  type ContestSubmissionFormData,
  type ContestSubmissionFormErrors,
} from "@/lib/contest-submission";

type ContestSubmitModalProps = {
  open: boolean;
  isBusy: boolean;
  form: ContestSubmissionFormData;
  onChange: (patch: Partial<ContestSubmissionFormData>) => void;
  onClose: () => void;
  onConfirm: () => void;
};

const inputClassName =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

const inputErrorClassName =
  "w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-100";

export function ContestSubmitModal({
  open,
  isBusy,
  form,
  onChange,
  onClose,
  onConfirm,
}: ContestSubmitModalProps) {
  const [errors, setErrors] = useState<ContestSubmissionFormErrors>({});
  const [touched, setTouched] = useState(false);

  if (!open) return null;

  const handleConfirm = () => {
    const result = validateContestSubmissionForm(form);
    setTouched(true);
    setErrors(result.errors);
    if (result.valid) onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">投稿表單</h2>
        <p className="mt-1 text-sm text-zinc-500">
          請填寫投稿資訊，驗證完成後即可提交作品。
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-900">作者名稱 *</label>
            <input
              type="text"
              value={form.authorName}
              disabled={isBusy}
              onChange={(e) => onChange({ authorName: e.target.value })}
              className={touched && errors.authorName ? inputErrorClassName : inputClassName}
            />
            {touched && errors.authorName && (
              <p className="mt-1 text-xs text-red-600">{errors.authorName}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-900">設計人 *</label>
            <input
              type="text"
              value={form.designerName}
              disabled={isBusy}
              onChange={(e) => onChange({ designerName: e.target.value })}
              className={touched && errors.designerName ? inputErrorClassName : inputClassName}
            />
            {touched && errors.designerName && (
              <p className="mt-1 text-xs text-red-600">{errors.designerName}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-900">聯繫方式 *</label>
            <input
              type="text"
              value={form.contact}
              disabled={isBusy}
              onChange={(e) => onChange({ contact: e.target.value })}
              className={touched && errors.contact ? inputErrorClassName : inputClassName}
            />
            {touched && errors.contact && (
              <p className="mt-1 text-xs text-red-600">{errors.contact}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-900">Email *</label>
            <input
              type="email"
              value={form.email}
              disabled={isBusy}
              onChange={(e) => onChange({ email: e.target.value })}
              className={touched && errors.email ? inputErrorClassName : inputClassName}
            />
            {touched && errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
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
            disabled={isBusy}
            onClick={handleConfirm}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {isBusy ? "提交中…" : "確認投稿"}
          </button>
        </div>
      </div>
    </div>
  );
}
