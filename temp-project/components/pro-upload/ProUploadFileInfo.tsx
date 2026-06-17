import type { ProUploadInspection } from "@/lib/pro-upload-inspect";

type ProUploadFileInfoProps = {
  inspection: ProUploadInspection;
};

function CheckRow({
  label,
  value,
  passed,
}: {
  label: string;
  value: string;
  passed: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 text-sm last:border-b-0">
      <div className="flex items-center gap-2">
        <span className={passed ? "text-emerald-500" : "text-gray-300"} aria-hidden>
          ✓
        </span>
        <span className="text-gray-700">{label}</span>
      </div>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function ProUploadFileInfo({ inspection }: ProUploadFileInfoProps) {
  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
      <h2 className="text-sm font-semibold text-gray-900">檔案檢查</h2>
      <dl className="mt-4">
        <div className="mb-4 space-y-3 border-b border-gray-100 pb-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">檔名</dt>
            <dd className="truncate text-right font-medium text-gray-900">{inspection.name}</dd>
          </div>
        </div>
        {inspection.checks.map((check) => (
          <CheckRow
            key={check.label}
            label={check.label}
            value={check.value}
            passed={check.passed}
          />
        ))}
      </dl>
    </section>
  );
}
