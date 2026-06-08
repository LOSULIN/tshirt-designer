"use client";

import { useState, type ReactNode } from "react";
import {
  BULK_QUANTITY_OPTIONS,
  validateCaseForm,
  type BulkQuantityRange,
  type ProUploadCaseFormData,
  type ProUploadCaseFormErrors,
} from "@/lib/pro-upload-case";

type ProUploadCaseStepProps = {
  form: ProUploadCaseFormData;
  onChange: (patch: Partial<ProUploadCaseFormData>) => void;
  onBack: () => void;
  onNext: () => void;
};

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm text-gray-700">
      {children}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

const inputErrorClassName =
  "w-full rounded-xl border border-red-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-100";

export function ProUploadCaseStep({ form, onChange, onBack, onNext }: ProUploadCaseStepProps) {
  const [errors, setErrors] = useState<ProUploadCaseFormErrors>({});
  const [touched, setTouched] = useState(false);

  const handleNext = () => {
    const result = validateCaseForm(form);
    setTouched(true);
    setErrors(result.errors);
    if (result.valid) onNext();
  };

  return (
    <div className="w-full max-w-2xl space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">建立案件資料</h1>
        <p className="mt-2 text-sm text-gray-500">請填寫聯絡資訊與訂製需求</p>
      </div>

      <SectionCard title="客戶基本資料">
        <div className="space-y-4">
          <div>
            <FieldLabel required>姓名</FieldLabel>
            <input
              type="text"
              value={form.name}
              onChange={(event) => onChange({ name: event.target.value })}
              className={touched && errors.name ? inputErrorClassName : inputClassName}
            />
            {touched && errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>
          <div>
            <FieldLabel required>Email</FieldLabel>
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange({ email: event.target.value })}
              className={touched && errors.email ? inputErrorClassName : inputClassName}
            />
            {touched && errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>
          <div>
            <FieldLabel required>手機</FieldLabel>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
              className={touched && errors.phone ? inputErrorClassName : inputClassName}
            />
            {touched && errors.phone && (
              <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="公司資訊" subtitle="選填">
        <div className="space-y-4">
          <div>
            <FieldLabel>公司名稱</FieldLabel>
            <input
              type="text"
              value={form.companyName}
              onChange={(event) => onChange({ companyName: event.target.value })}
              className={inputClassName}
            />
          </div>
          <div>
            <FieldLabel>統一編號</FieldLabel>
            <input
              type="text"
              value={form.taxId}
              onChange={(event) => onChange({ taxId: event.target.value })}
              className={inputClassName}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="大量訂製" subtitle="選填">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.bulkOrder}
            onChange={(event) => {
              const bulkOrder = event.target.checked;
              onChange({
                bulkOrder,
                quantityRange: bulkOrder ? form.quantityRange : "",
              });
            }}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">此案件為大量訂製</span>
        </label>

        {form.bulkOrder && (
          <div className="mt-4">
            <FieldLabel>預估數量</FieldLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {BULK_QUANTITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onChange({
                      quantityRange:
                        form.quantityRange === option.value
                          ? ""
                          : (option.value as BulkQuantityRange),
                    })
                  }
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    form.quantityRange === option.value
                      ? "border-blue-500 bg-blue-50 font-medium text-blue-900"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="TIIIGO Marketplace" subtitle="選填">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.marketplaceApply}
            onChange={(event) => onChange({ marketplaceApply: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">同步申請上架 TIIIGO Marketplace</span>
        </label>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          提交後將由 TIIIGO 團隊進行審核。審核通過後可於平台公開販售。
        </p>
      </SectionCard>

      <SectionCard title="備註" subtitle="選填">
        <textarea
          value={form.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          rows={4}
          placeholder="特殊需求或補充說明…"
          className={`${inputClassName} resize-none`}
        />
      </SectionCard>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          上一步
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
        >
          下一步
        </button>
      </div>
    </div>
  );
}
