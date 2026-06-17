/**
 * Proof Engine — generateProof(order, version)
 * 產生 Proof PDF + 設計包 ZIP，僅寄一封管理員通知信。
 */

import { buildDesignPackageZip } from "./design-package-zip";
import { buildOrderJson, serializeOrderJson } from "./order-json";
import { buildValidationReport } from "./validation-report";
import { generateProofPdf } from "./generators/proof-pdf-generator";
import {
  buildOrderProofPdfFilename,
  buildOrderStoragePath,
  buildOrderZipFilename,
  createProofSignedUrl,
  uploadOrderFile,
} from "./storage-manager";
import { sendSubmissionAdminEmail, type ProofEmailResult } from "./proof-email";
import type { SubmitTiming } from "./submit-timing";
import type {
  ProofArtifactsInput,
  ProofEngineContext,
  ProofInternalFiles,
  ProofOrder,
  ProofPackage,
} from "./types";
import { PROOF_STORAGE_FILES } from "./types";

function bufferFrom(data: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export interface ProofGenerationResult {
  package: ProofPackage;
  email: ProofEmailResult;
}

/** 同步階段：上傳申請原始檔與客戶端產生的 mockup / print 圖。 */
export async function uploadSubmissionFiles(
  ctx: ProofEngineContext,
  submissionNo: string,
  internalFiles: ProofInternalFiles,
  artifacts: ProofArtifactsInput,
): Promise<void> {
  await uploadOrderFile(
    ctx,
    submissionNo,
    PROOF_STORAGE_FILES.designJson,
    internalFiles.designJson,
    "application/json",
  );

  if (internalFiles.textJson) {
    await uploadOrderFile(
      ctx,
      submissionNo,
      PROOF_STORAGE_FILES.textsJson,
      internalFiles.textJson,
      "application/json",
    );
  }

  if (internalFiles.applicantJson) {
    await uploadOrderFile(
      ctx,
      submissionNo,
      PROOF_STORAGE_FILES.applicantJson,
      internalFiles.applicantJson,
      "application/json",
    );
  }

  if (internalFiles.original) {
    await uploadOrderFile(
      ctx,
      submissionNo,
      internalFiles.original.filename,
      internalFiles.original.buffer,
      "image/png",
    );
  }

  const artifactUploads: Promise<string>[] = [];

  if (artifacts.mockups.front?.length) {
    artifactUploads.push(
      uploadOrderFile(
        ctx,
        submissionNo,
        PROOF_STORAGE_FILES.mockupFront,
        bufferFrom(artifacts.mockups.front),
        "image/png",
      ),
    );
  }

  if (artifacts.mockups.back?.length) {
    artifactUploads.push(
      uploadOrderFile(
        ctx,
        submissionNo,
        PROOF_STORAGE_FILES.mockupBack,
        bufferFrom(artifacts.mockups.back),
        "image/png",
      ),
    );
  }

  if (artifacts.prints.front?.length) {
    artifactUploads.push(
      uploadOrderFile(
        ctx,
        submissionNo,
        PROOF_STORAGE_FILES.printFront,
        bufferFrom(artifacts.prints.front),
        "image/png",
      ),
    );
  }

  if (artifacts.prints.back?.length) {
    artifactUploads.push(
      uploadOrderFile(
        ctx,
        submissionNo,
        PROOF_STORAGE_FILES.printBack,
        bufferFrom(artifacts.prints.back),
        "image/png",
      ),
    );
  }

  await Promise.all(artifactUploads);
}

/** 背景階段：PDF、ZIP、簽章連結、管理員通知信。 */
export async function generateProofDocuments(
  order: ProofOrder,
  version: number,
  artifacts: ProofArtifactsInput,
  ctx: ProofEngineContext,
  internalFiles: ProofInternalFiles,
  timing?: SubmitTiming,
): Promise<ProofGenerationResult> {
  if (!order.submission_no) {
    throw new Error("generateProofDocuments 需要 submission_no");
  }

  const createdAt = order.created_at ?? new Date().toISOString();
  const submissionNo = order.submission_no;
  const storagePath = buildOrderStoragePath(submissionNo);

  timing?.mark("generateMockup");

  const proofPdfBytes = await generateProofPdf({
    order,
    version,
    mockupImages: artifacts.mockups,
    printImages: artifacts.prints,
  });
  timing?.mark("generatePdf");
  const proofPdf = bufferFrom(proofPdfBytes);

  const validationReport = buildValidationReport(order, createdAt);
  const orderJson = buildOrderJson(order, version, validationReport);

  const zipBuffer = await buildDesignPackageZip({
    submissionNo,
    proofPdf,
    orderJson,
    validationReport,
    mockupFront: artifacts.mockups.front
      ? bufferFrom(artifacts.mockups.front)
      : undefined,
    mockupBack: artifacts.mockups.back
      ? bufferFrom(artifacts.mockups.back)
      : undefined,
    printFront: artifacts.prints.front
      ? bufferFrom(artifacts.prints.front)
      : undefined,
    printBack: artifacts.prints.back
      ? bufferFrom(artifacts.prints.back)
      : undefined,
    original: internalFiles.original,
  });
  timing?.mark("generateZip");

  const proofPdfFilename = buildOrderProofPdfFilename(submissionNo);
  const zipFilename = buildOrderZipFilename(submissionNo);

  const proofPdfPath = await uploadOrderFile(
    ctx,
    submissionNo,
    proofPdfFilename,
    proofPdf,
    "application/pdf",
  );

  const zipPath = await uploadOrderFile(
    ctx,
    submissionNo,
    zipFilename,
    zipBuffer,
    "application/zip",
  );

  const proofPackage: ProofPackage = {
    order_id: order.order_id,
    submission_no: submissionNo,
    version,
    storage_path: storagePath,
    pdf_url: await createProofSignedUrl(ctx, proofPdfPath, {
      downloadFilename: proofPdfFilename,
    }),
    zip_url: await createProofSignedUrl(ctx, zipPath, {
      downloadFilename: zipFilename,
    }),
    created_at: createdAt,
  };

  await uploadOrderFile(
    ctx,
    submissionNo,
    PROOF_STORAGE_FILES.proofPackage,
    JSON.stringify(proofPackage, null, 2),
    "application/json",
  );

  await uploadOrderFile(
    ctx,
    submissionNo,
    PROOF_STORAGE_FILES.orderJson,
    serializeOrderJson(orderJson),
    "application/json",
  );

  timing?.mark("uploadProofFiles");

  const email = await sendSubmissionAdminEmail({ order, proofPackage });
  timing?.mark("sendEmail");

  return { package: proofPackage, email };
}

/** 完整同步流程（測試／腳本用）。 */
export async function generateProof(
  order: ProofOrder,
  version: number,
  artifacts: ProofArtifactsInput,
  ctx: ProofEngineContext,
  internalFiles: ProofInternalFiles,
): Promise<ProofGenerationResult> {
  if (!order.submission_no) {
    throw new Error("generateProof 需要 submission_no");
  }

  await uploadSubmissionFiles(
    ctx,
    order.submission_no,
    internalFiles,
    artifacts,
  );
  return generateProofDocuments(
    order,
    version,
    artifacts,
    ctx,
    internalFiles,
  );
}
