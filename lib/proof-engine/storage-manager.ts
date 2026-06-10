/**
 * Proof Engine Storage — orders/{submission_no}/
 */

import { DESIGNS_BUCKET } from "../supabase/admin";
import type { ProofEngineContext } from "./types";

export function buildOrderStoragePath(submissionNo: string): string {
  return `orders/${submissionNo}`;
}

export function buildOrderProofPdfFilename(submissionNo: string): string {
  return `${submissionNo}-proof.pdf`;
}

export function buildOrderZipFilename(submissionNo: string): string {
  return `${submissionNo}.zip`;
}

/** @deprecated 使用 buildOrderStoragePath */
export function buildProofStoragePath(submissionNo: string): string {
  return buildOrderStoragePath(submissionNo);
}

function toBuffer(data: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export async function uploadOrderFile(
  ctx: ProofEngineContext,
  submissionNo: string,
  filename: string,
  body: Uint8Array | Buffer | string,
  contentType: string,
): Promise<string> {
  const path = `${buildOrderStoragePath(submissionNo)}/${filename}`;
  const buffer =
    typeof body === "string" ? Buffer.from(body, "utf-8") : toBuffer(body);

  const { error } = await ctx.supabase.storage
    .from(DESIGNS_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) {
    throw new Error(`Proof storage upload failed (${path}): ${error.message}`);
  }

  return path;
}

export async function createProofSignedUrl(
  ctx: ProofEngineContext,
  storagePath: string,
  options?: { downloadFilename?: string },
): Promise<string> {
  const ttl = ctx.signedUrlTtlSeconds ?? 60 * 60 * 24 * 7;
  const download = options?.downloadFilename ?? true;
  const { data, error } = await ctx.supabase.storage
    .from(DESIGNS_BUCKET)
    .createSignedUrl(storagePath, ttl, { download });

  if (error || !data?.signedUrl) {
    throw new Error(
      error?.message ?? `無法建立簽章連結: ${storagePath}`,
    );
  }

  return data.signedUrl;
}
