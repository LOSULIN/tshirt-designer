/**
 * Proof Engine Storage Manager — orders/{order_id}/v{version}/
 */

import { DESIGNS_BUCKET } from "../supabase/admin";
import type { ProofEngineContext } from "./types";
import { PROOF_STORAGE_FILES } from "./types";

export function buildProofStoragePath(orderId: string, version: number): string {
  return `orders/${orderId}/v${version}`;
}

export function buildProofStorageFilePath(
  orderId: string,
  version: number,
  filename: string,
): string {
  return `${buildProofStoragePath(orderId, version)}/${filename}`;
}

function toBuffer(data: Uint8Array | Buffer): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

export async function uploadProofFile(
  ctx: ProofEngineContext,
  orderId: string,
  version: number,
  filename: string,
  body: Uint8Array | Buffer | string,
  contentType: string,
): Promise<string> {
  const path = buildProofStorageFilePath(orderId, version, filename);
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
): Promise<string> {
  const ttl = ctx.signedUrlTtlSeconds ?? 60 * 60 * 24 * 7;
  const { data, error } = await ctx.supabase.storage
    .from(DESIGNS_BUCKET)
    .createSignedUrl(storagePath, ttl);

  if (error || !data?.signedUrl) {
    throw new Error(
      error?.message ?? `無法建立簽章連結: ${storagePath}`,
    );
  }

  return data.signedUrl;
}

export async function uploadProofArtifacts(
  ctx: ProofEngineContext,
  orderId: string,
  version: number,
  files: { filename: string; body: Uint8Array | Buffer | string; contentType: string }[],
): Promise<Record<string, string>> {
  const paths: Record<string, string> = {};

  for (const file of files) {
    paths[file.filename] = await uploadProofFile(
      ctx,
      orderId,
      version,
      file.filename,
      file.body,
      file.contentType,
    );
  }

  return paths;
}

export { PROOF_STORAGE_FILES };
