"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { Product } from "@/lib/constants";
import {
  createEmptyCaseForm,
  type ProUploadCaseFormData,
} from "@/lib/pro-upload-case";
import {
  inspectProUploadFile,
  type ProUploadInspection,
} from "@/lib/pro-upload-inspect";
import type { ProUploadProductSelection } from "@/lib/pro-upload-proof";
import {
  isAllowedProUploadFile,
  isRasterImageFile,
  PRO_UPLOAD_ACCEPT,
  PRO_UPLOAD_FORMATS,
  PRO_UPLOAD_PDF_NOTE,
  PRO_UPLOAD_RASTER_HINT_LINES,
} from "@/lib/pro-upload";
import { ProUploadCaseStep } from "./ProUploadCaseStep";
import { ProUploadFileInfo } from "./ProUploadFileInfo";
import { ProUploadProductStep } from "./ProUploadProductStep";
import { ProUploadProofStep } from "./ProUploadProofStep";
import { ProUploadStepIndicator } from "./ProUploadStepIndicator";
import { ProUploadSubmitStep } from "./ProUploadSubmitStep";

type FlowStep = "product" | "upload" | "check" | "proof" | "case" | "submit";

const PRO_UPLOAD_TAGLINE =
  "提供給設計師、品牌主理人、工作室與企業客戶，直接提交正式設計檔案";

function getStepIndex(step: FlowStep): 0 | 1 | 2 | 3 | 4 | 5 {
  switch (step) {
    case "product":
      return 0;
    case "upload":
      return 1;
    case "check":
      return 2;
    case "proof":
      return 3;
    case "case":
      return 4;
    case "submit":
      return 5;
  }
}

function ProUploadHeader() {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">專業設計師交稿</h1>
      <p className="mt-2 text-sm text-gray-500">{PRO_UPLOAD_TAGLINE}</p>
    </div>
  );
}

export function ProUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>("product");
  const [productSelection, setProductSelection] = useState<ProUploadProductSelection>({
    product: "basic-tshirt",
    fit: "male",
  });
  const [caseForm, setCaseForm] = useState<ProUploadCaseFormData>(createEmptyCaseForm);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<ProUploadInspection | null>(null);
  const [isRasterHint, setIsRasterHint] = useState(false);
  const [genericHint, setGenericHint] = useState<string | null>(null);

  const applyFile = useCallback(async (file: File | undefined) => {
    if (!file) return;

    if (isRasterImageFile(file)) {
      setSelectedFile(null);
      setInspection(null);
      setIsParsing(false);
      setIsRasterHint(true);
      setGenericHint(null);
      return;
    }

    if (!isAllowedProUploadFile(file)) {
      setSelectedFile(null);
      setInspection(null);
      setIsParsing(false);
      setIsRasterHint(false);
      setGenericHint("此區域僅接受 PDF、AI、PSD 格式。");
      return;
    }

    setGenericHint(null);
    setIsRasterHint(false);
    setIsParsing(true);
    setSelectedFile(file);
    setInspection(null);

    const result = await inspectProUploadFile(file);
    setInspection(result);
    setIsParsing(false);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    void applyFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void applyFile(event.dataTransfer.files[0]);
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedFile || !inspection || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("designFile", selectedFile);
      formData.append(
        "submissionJson",
        JSON.stringify({
          product: productSelection.product,
          fit: productSelection.fit,
          inspection,
          caseForm,
        }),
      );

      const response = await fetch("/api/pro-upload/submit", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("submit failed");
      }

      setSubmitted(true);
    } catch {
      setSubmitError("送出失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    caseForm,
    inspection,
    isSubmitting,
    productSelection.fit,
    productSelection.product,
    selectedFile,
  ]);

  const stepIndex = getStepIndex(flowStep);

  if (flowStep === "product") {
    return (
      <div className="w-full max-w-xl">
        <ProUploadHeader />
        <ProUploadStepIndicator current={stepIndex} />
        <ProUploadProductStep
          product={productSelection.product}
          fit={productSelection.fit}
          onProductChange={(product: Product) =>
            setProductSelection((prev) => ({ ...prev, product }))
          }
          onFitChange={(fit) =>
            setProductSelection((prev) => ({ ...prev, fit }))
          }
          onNext={() => setFlowStep("upload")}
        />
      </div>
    );
  }

  if (flowStep === "check" && inspection) {
    return (
      <div className="w-full max-w-xl">
        <ProUploadHeader />
        <ProUploadStepIndicator current={stepIndex} />
        <ProUploadFileInfo inspection={inspection} />
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => setFlowStep("upload")}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={() => setFlowStep("proof")}
            className="flex-1 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
          >
            下一步
          </button>
        </div>
      </div>
    );
  }

  if (flowStep === "proof" && inspection) {
    return (
      <div className="w-full max-w-2xl">
        <ProUploadStepIndicator current={stepIndex} />
        <ProUploadProofStep
          productSelection={productSelection}
          inspection={inspection}
          onBack={() => setFlowStep("check")}
          onNext={() => setFlowStep("case")}
        />
      </div>
    );
  }

  if (flowStep === "case") {
    return (
      <div className="w-full max-w-2xl">
        <ProUploadStepIndicator current={stepIndex} />
        <ProUploadCaseStep
          form={caseForm}
          onChange={(patch) => setCaseForm((prev) => ({ ...prev, ...patch }))}
          onBack={() => setFlowStep("proof")}
          onNext={() => setFlowStep("submit")}
        />
      </div>
    );
  }

  if (flowStep === "submit" && inspection) {
    return (
      <div className="w-full max-w-2xl">
        {!submitted && <ProUploadStepIndicator current={stepIndex} />}
        <ProUploadSubmitStep
          productSelection={productSelection}
          inspection={inspection}
          caseForm={caseForm}
          submitted={submitted}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onBack={() => {
            if (!submitted && !isSubmitting) setFlowStep("case");
          }}
          onSubmit={() => {
            void handleSubmit();
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <ProUploadHeader />
      <ProUploadStepIndicator current={stepIndex} />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`cursor-pointer rounded-2xl border-2 border-dashed bg-white p-10 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50/40 ring-blue-100"
            : "border-gray-200 ring-gray-100 hover:border-gray-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={PRO_UPLOAD_ACCEPT}
          className="hidden"
          onChange={handleInputChange}
        />

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-500">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <p className="mt-4 text-sm font-medium text-gray-700">上傳設計檔案</p>
        <p className="mt-2 text-sm text-gray-500">拖曳檔案至此</p>
        <p className="mt-1 text-sm text-gray-400">或</p>

        <span className="mt-4 inline-flex rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium text-white">
          選擇檔案
        </span>

        <p className="mt-5 text-xs text-gray-500">支援格式：</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {PRO_UPLOAD_FORMATS.map((type) => (
            <span
              key={type.value}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ring-1 ${
                type.value === "pdf"
                  ? "bg-blue-50 text-blue-700 ring-blue-200"
                  : "bg-gray-50 text-gray-500 ring-gray-200"
              }`}
            >
              {type.label}
            </span>
          ))}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-gray-400">{PRO_UPLOAD_PDF_NOTE}</p>
      </div>

      {(isRasterHint || genericHint) && (
        <div
          className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-center text-sm text-gray-600 ring-1 ring-gray-100"
          role="status"
        >
          {isRasterHint ? (
            <div className="space-y-0.5 leading-relaxed">
              {PRO_UPLOAD_RASTER_HINT_LINES.map((line, index) =>
                line ? (
                  <p key={index}>{line}</p>
                ) : (
                  <p key={index} className="h-1" aria-hidden />
                ),
              )}
            </div>
          ) : (
            <p>{genericHint}</p>
          )}
          {isRasterHint && (
            <Link
              href="/designer"
              className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              前往自由設計 →
            </Link>
          )}
        </div>
      )}

      {isParsing && (
        <section className="mt-8 rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">檔案檢查</h2>
          <p className="mt-4 text-sm text-gray-500">檢查中…</p>
        </section>
      )}

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => setFlowStep("product")}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          上一步
        </button>
        <button
          type="button"
          disabled={!inspection || isParsing}
          onClick={() => setFlowStep("check")}
          className="flex-1 rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
        >
          下一步
        </button>
      </div>
    </div>
  );
}
