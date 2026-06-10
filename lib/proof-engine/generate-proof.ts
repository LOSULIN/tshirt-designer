/**
 * Proof Engine — generateProof(order, version)
 * Submit 僅觸發此服務；所有輸出經 Storage Manager 標準化存放。
 */

import { generateProofPdf } from "./generators/proof-pdf-generator";
import {
  buildProofStoragePath,
  createProofSignedUrl,
  uploadProofArtifacts,
  uploadProofFile,
  PROOF_STORAGE_FILES,
} from "./storage-manager";
import { sendProofPackageEmails, type ProofEmailResults } from "./proof-email";
import type {
  ProofArtifactsInput,
  ProofEngineContext,
  ProofOrder,
  ProofPackage,
} from "./types";
import type { Side } from "../constants";

function bufferFrom(data: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export interface ProofGenerationResult {
  package: ProofPackage;
  emails: ProofEmailResults;
}

export async function generateProof(
  order: ProofOrder,
  version: number,
  artifacts: ProofArtifactsInput,
  ctx: ProofEngineContext,
): Promise<ProofGenerationResult> {
  const createdAt = order.created_at ?? new Date().toISOString();
  const storagePath = buildProofStoragePath(order.order_id, version);

  const uploadFiles: {
    filename: string;
    body: Uint8Array | Buffer | string;
    contentType: string;
  }[] = [];

  for (const side of ["front", "back"] as const) {
    const mockup = artifacts.mockups[side];
    if (mockup && mockup.length > 0) {
      uploadFiles.push({
        filename:
          side === "front"
            ? PROOF_STORAGE_FILES.mockupFront
            : PROOF_STORAGE_FILES.mockupBack,
        body: bufferFrom(mockup),
        contentType: "image/png",
      });
    }

    const print = artifacts.prints[side];
    if (print && print.length > 0) {
      uploadFiles.push({
        filename:
          side === "front"
            ? PROOF_STORAGE_FILES.printFront
            : PROOF_STORAGE_FILES.printBack,
        body: bufferFrom(print),
        contentType: "image/png",
      });
    }
  }

  const proofPdfBytes = await generateProofPdf({
    order,
    version,
    mockupImages: artifacts.mockups,
  });

  uploadFiles.push({
    filename: PROOF_STORAGE_FILES.proofPdf,
    body: proofPdfBytes,
    contentType: "application/pdf",
  });

  const storedPaths = await uploadProofArtifacts(
    ctx,
    order.order_id,
    version,
    uploadFiles,
  );

  const proofPackage: ProofPackage = {
    order_id: order.order_id,
    version,
    storage_path: storagePath,
    mockup_front_url: storedPaths[PROOF_STORAGE_FILES.mockupFront]
      ? await createProofSignedUrl(ctx, storedPaths[PROOF_STORAGE_FILES.mockupFront])
      : null,
    mockup_back_url: storedPaths[PROOF_STORAGE_FILES.mockupBack]
      ? await createProofSignedUrl(ctx, storedPaths[PROOF_STORAGE_FILES.mockupBack])
      : null,
    print_file_url: await resolvePrintFileUrl(
      ctx,
      order.active_side,
      storedPaths,
    ),
    print_back_url: await resolvePrintUrlForSide(
      ctx,
      "back",
      storedPaths,
      order.active_side,
    ),
    pdf_url: await createProofSignedUrl(
      ctx,
      storedPaths[PROOF_STORAGE_FILES.proofPdf],
    ),
    created_at: createdAt,
  };

  await uploadProofFile(
    ctx,
    order.order_id,
    version,
    PROOF_STORAGE_FILES.proofPackage,
    JSON.stringify(proofPackage, null, 2),
    "application/json",
  );

  const emails = await sendProofPackageEmails({ order, proofPackage });

  return { package: proofPackage, emails };
}

async function resolvePrintFileUrl(
  ctx: ProofEngineContext,
  activeSide: Side,
  storedPaths: Record<string, string>,
): Promise<string | null> {
  const primaryKey =
    activeSide === "front"
      ? PROOF_STORAGE_FILES.printFront
      : PROOF_STORAGE_FILES.printBack;
  const fallbackKey =
    activeSide === "front"
      ? PROOF_STORAGE_FILES.printBack
      : PROOF_STORAGE_FILES.printFront;

  const path = storedPaths[primaryKey] ?? storedPaths[fallbackKey];
  if (!path) return null;
  return createProofSignedUrl(ctx, path);
}

async function resolvePrintUrlForSide(
  ctx: ProofEngineContext,
  side: Side,
  storedPaths: Record<string, string>,
  activeSide: Side,
): Promise<string | null> {
  if (side === activeSide) return null;
  const key =
    side === "front"
      ? PROOF_STORAGE_FILES.printFront
      : PROOF_STORAGE_FILES.printBack;
  const path = storedPaths[key];
  if (!path) return null;
  return createProofSignedUrl(ctx, path);
}
