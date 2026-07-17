/**
 * Upload Manager — wraps Proof Engine storage uploads (Phase 29-1C).
 * Logic unchanged; delegates to existing uploadSubmissionFiles.
 */

import { uploadSubmissionFiles } from "@/lib/proof-engine/generate-proof";
import { DESIGNS_BUCKET } from "@/lib/supabase/admin";
import { createSubmissionLogger } from "./logger";
import { submissionProfiler } from "./profiler";
import type {
  SubmissionUploadInput,
  SubmissionUploadManager,
} from "./types";
import type { ProofEngineContext } from "./types";

export class ProofEngineSubmissionUploadManager implements SubmissionUploadManager {
  private readonly log = createSubmissionLogger({ phase: "upload" });

  async uploadFiles(input: SubmissionUploadInput): Promise<void> {
    await submissionProfiler.run("Upload", "server-sync", async () =>
      uploadSubmissionFiles(
        input.ctx,
        input.submissionNo,
        input.internalFiles,
        input.artifacts,
      ),
    );
  }

  async rollback(
    ctx: ProofEngineContext,
    storagePaths: string[],
  ): Promise<void> {
    if (storagePaths.length === 0) return;

    await ctx.supabase.storage
      .from(DESIGNS_BUCKET)
      .remove(storagePaths);
  }

  async cleanup(
    ctx: ProofEngineContext,
    storageFolder: string,
  ): Promise<void> {
    this.log.info("cleanup folder", { storageFolder });

    const { data: files, error: listError } = await ctx.supabase.storage
      .from(DESIGNS_BUCKET)
      .list(storageFolder);

    if (listError) {
      this.log.error("cleanup list failed", listError);
      throw new Error(`Storage cleanup list failed: ${listError.message}`);
    }

    if (!files?.length) {
      return;
    }

    const paths = files.map((file) => `${storageFolder}/${file.name}`);
    await this.rollback(ctx, paths);
  }
}

export const defaultSubmissionUploadManager: SubmissionUploadManager =
  new ProofEngineSubmissionUploadManager();

export function createSubmissionUploadManager(): SubmissionUploadManager {
  return new ProofEngineSubmissionUploadManager();
}
