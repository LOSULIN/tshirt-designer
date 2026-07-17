/**
 * Idempotency interface — not persisted in Phase 29-1C.
 */

export type IdempotencyKey = string;

export type IdempotencyClaimStatus =
  | "not_implemented"
  | "claimed"
  | "duplicate"
  | "completed";

export interface IdempotencyClaimResult {
  status: IdempotencyClaimStatus;
  existingSubmissionNo?: string;
  message?: string;
}

export interface IdempotencyStore {
  claim(key: IdempotencyKey): Promise<IdempotencyClaimResult>;
  complete(key: IdempotencyKey, submissionNo: string): Promise<void>;
  release(key: IdempotencyKey): Promise<void>;
}

const NOT_IMPLEMENTED_MESSAGE =
  "Idempotency store not implemented (Phase 29-1C foundation only)";

/** Default store — always returns not_implemented until a future phase wires persistence. */
export function createNotImplementedIdempotencyStore(): IdempotencyStore {
  return {
    async claim(): Promise<IdempotencyClaimResult> {
      return {
        status: "not_implemented",
        message: NOT_IMPLEMENTED_MESSAGE,
      };
    },
    async complete(): Promise<void> {
      // no-op
    },
    async release(): Promise<void> {
      // no-op
    },
  };
}

export function isIdempotencyImplemented(result: IdempotencyClaimResult): boolean {
  return result.status !== "not_implemented";
}
