/**
 * Proof Engine — generateProof(order, version)
 * 產生 Proof PDF + 設計包 ZIP，僅寄一封管理員通知信。
 */

import { buildDesignPackageZip } from "./design-package-zip";
import { generateProofPdf } from "./generators/proof-pdf-generator";
import {
  buildOrderProofPdfFilename,
  buildOrderStoragePath,
  buildOrderZipFilename,
  createProofSignedUrl,
  uploadOrderFile,
} from "./storage-manager";
import { sendSubmissionAdminEmail, type ProofEmailResult } from "./proof-email";
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

  const createdAt = order.created_at ?? new Date().toISOString();
  const submissionNo = order.submission_no;
  const storagePath = buildOrderStoragePath(submissionNo);

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

  const proofPdfBytes = await generateProofPdf({
    order,
    version,
    mockupImages: artifacts.mockups,
  });
  const proofPdf = bufferFrom(proofPdfBytes);

  const zipBuffer = await buildDesignPackageZip({
    submissionNo,
    proofPdf,
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

  const email = await sendSubmissionAdminEmail({ order, proofPackage });

  return { package: proofPackage, email };
}
