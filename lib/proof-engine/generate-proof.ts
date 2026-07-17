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
import type { Side } from "./proof-domain";
import type {
  ProofArtifact,
  ProofArtifactsInput,
  ProofEngineContext,
  ProofInternalFiles,
  ProofOrder,
  ProofPackage,
} from "./types";
import { proofArtifactHasBytes, PROOF_STORAGE_FILES } from "./types";
import { submissionProfiler } from "../submission/profiler";

function bufferFrom(data: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

function asBufferArtifact(
  data: ProofArtifact | undefined,
): Uint8Array | Buffer | undefined {
  if (!data || data instanceof Blob) {
    return undefined;
  }
  return data;
}

function asZipBufferArtifact(
  data: ProofArtifact | undefined,
): Buffer | undefined {
  const artifact = asBufferArtifact(data);
  return artifact ? bufferFrom(artifact) : undefined;
}

function asBufferArtifactRecord(
  record: Partial<Record<Side, ProofArtifact>>,
): Partial<Record<Side, Uint8Array | Buffer>> {
  const out: Partial<Record<Side, Uint8Array | Buffer>> = {};
  for (const side of ["front", "back"] as const) {
    const value = asBufferArtifact(record[side]);
    if (value) {
      out[side] = value;
    }
  }
  return out;
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

  if (proofArtifactHasBytes(artifacts.mockups.front)) {
    const front = asBufferArtifact(artifacts.mockups.front);
    if (front) {
      artifactUploads.push(
        uploadOrderFile(
          ctx,
          submissionNo,
          PROOF_STORAGE_FILES.mockupFront,
          bufferFrom(front),
          "image/png",
        ),
      );
    }
  }

  if (proofArtifactHasBytes(artifacts.mockups.back)) {
    const back = asBufferArtifact(artifacts.mockups.back);
    if (back) {
      artifactUploads.push(
        uploadOrderFile(
          ctx,
          submissionNo,
          PROOF_STORAGE_FILES.mockupBack,
          bufferFrom(back),
          "image/png",
        ),
      );
    }
  }

  if (proofArtifactHasBytes(artifacts.prints.front)) {
    const front = asBufferArtifact(artifacts.prints.front);
    if (front) {
      artifactUploads.push(
        uploadOrderFile(
          ctx,
          submissionNo,
          PROOF_STORAGE_FILES.printFront,
          bufferFrom(front),
          "image/png",
        ),
      );
    }
  }

  if (proofArtifactHasBytes(artifacts.prints.back)) {
    const back = asBufferArtifact(artifacts.prints.back);
    if (back) {
      artifactUploads.push(
        uploadOrderFile(
          ctx,
          submissionNo,
          PROOF_STORAGE_FILES.printBack,
          bufferFrom(back),
          "image/png",
        ),
      );
    }
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
  return submissionProfiler.run("Background", "server-background", async () => {
    submissionProfiler.mark("submission:server:background:start");
    try {
      if (!order.submission_no) {
        throw new Error("generateProofDocuments 需要 submission_no");
      }

      const createdAt = order.created_at ?? new Date().toISOString();
      const submissionNo = order.submission_no;
      const storagePath = buildOrderStoragePath(submissionNo);

      submissionProfiler.record("Mockup", 0, "server-background");
      timing?.mark("generateMockup");

      const proofPdfBytes = await submissionProfiler.run(
        "PDF",
        "server-background",
        async () =>
          generateProofPdf({
            order,
            version,
            mockupImages: asBufferArtifactRecord(artifacts.mockups),
            printImages: asBufferArtifactRecord(artifacts.prints),
          }),
      );
      timing?.mark("generatePdf");
      const proofPdf = bufferFrom(proofPdfBytes);

      const validationReport = buildValidationReport(order, createdAt);
      const orderJson = buildOrderJson(order, version, validationReport);

      const zipBuffer = await submissionProfiler.run(
        "ZIP",
        "server-background",
        async () =>
          buildDesignPackageZip({
            submissionNo,
            proofPdf,
            orderJson,
            validationReport,
            mockupFront: asZipBufferArtifact(artifacts.mockups.front),
            mockupBack: asZipBufferArtifact(artifacts.mockups.back),
            printFront: asZipBufferArtifact(artifacts.prints.front),
            printBack: asZipBufferArtifact(artifacts.prints.back),
            original: internalFiles.original,
          }),
      );
      timing?.mark("generateZip");

      const proofPdfFilename = buildOrderProofPdfFilename(submissionNo);
      const zipFilename = buildOrderZipFilename(submissionNo);

      const proofPackage = await submissionProfiler.run(
        "Proof Upload",
        "server-background",
        async () => {
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

          const pkg: ProofPackage = {
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
            JSON.stringify(pkg, null, 2),
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
          return pkg;
        },
      );

      const email = await submissionProfiler.run(
        "Email",
        "server-background",
        async () => sendSubmissionAdminEmail({ order, proofPackage }),
      );
      timing?.mark("sendEmail");

      return { package: proofPackage, email };
    } finally {
      try {
        submissionProfiler.mark("submission:server:background:end");
        submissionProfiler.flush();
      } catch {
        // Profiler is passive; background proof generation must still complete.
      }
    }
  });
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
