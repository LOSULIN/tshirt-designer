import {
  PRO_UPLOAD_FIT_OPTIONS,
  getProductLabel,
  type ProUploadFit,
} from "@/lib/pro-upload-proof";

type ProUploadProductStepProps = {
  fit: ProUploadFit;
  onFitChange: (fit: ProUploadFit) => void;
  onNext: () => void;
};

export function ProUploadProductStep({
  fit,
  onFitChange,
  onNext,
}: ProUploadProductStepProps) {
  return (
    <div className="w-full max-w-xl">
      <section className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Step 1 商品與版型</h2>
        <div className="mt-1 space-y-0.5 text-xs leading-relaxed text-gray-500">
          <p>商品：{getProductLabel()}</p>
          <p>請選擇版型進行設計申請</p>
        </div>

        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-500">商品</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{getProductLabel()}</p>
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-xs font-medium text-gray-500">版型</p>
          <div className="grid grid-cols-3 gap-2">
            {PRO_UPLOAD_FIT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onFitChange(option.id)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  fit === option.id
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onNext}
        className="mt-8 w-full rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
      >
        下一步
      </button>
    </div>
  );
}
