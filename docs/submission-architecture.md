# Submission Architecture — Phase 29-1C Foundation

## Purpose

Establish server-side abstractions for **Reliable Submission** without changing:

- Designer runtime (`components/designer/**`)
- Public API contracts (`POST /api/designs/submit`, contest, pro-upload)
- FormData format, response JSON, or API URLs
- Proof Engine algorithms

Routes continue to call Supabase and Proof Engine directly. The new `lib/submission/**` layer is **additive only** and ready for future wiring.

## Module Layout

```
lib/submission/
  index.ts                  — public exports
  types.ts                  — repository & upload interfaces
  status.ts                 — lifecycle status types (TS only)
  submission-repository.ts  — SupabaseSubmissionRepository
  upload-manager.ts         — ProofEngineSubmissionUploadManager
  logger.ts                 — SubmissionLogger
  idempotency.ts            — IdempotencyStore (not implemented)
```

## Submission Repository

`SupabaseSubmissionRepository` wraps existing patterns from API routes:

| Method | Wraps |
|--------|--------|
| `createDesignSubmission` | `design_submissions.insert` + `allocateSubmissionNo` retry |
| `createProSubmission` | `submissions.insert` + PD number retry |
| `findDesignSubmission` | `design_submissions` select by id |
| `findProSubmission` | `submissions` select by id |
| `updateDesignSubmission` | `design_submissions.update` |
| `markSubmitted` | status update (maps lifecycle → DB constraint) |
| `markFailed` | log + pro `rejected` when mappable |

**No DB schema changes.** Lifecycle states like `uploading`, `proof_processing`, `failed` exist as TypeScript only until a future migration.

## Upload Manager

`ProofEngineSubmissionUploadManager` delegates to:

- `uploadFiles` → `uploadSubmissionFiles()` (unchanged logic)
- `rollback` → `storage.remove(paths)` (contest/pro pattern)
- `cleanup` → list folder + remove files

## Status Model

| Lifecycle (future) | `design_submissions` today | `submissions` today |
|--------------------|---------------------------|---------------------|
| `draft` | `draft` | — |
| `pending` / `uploading` | — | `pending` |
| `submitted` / `proof_processing` / `completed` | `submitted` | `reviewing` (approx) |
| `failed` | log only | `rejected` |

## Idempotency

`createNotImplementedIdempotencyStore()` returns `{ status: "not_implemented" }` for all claims. No persistence in 29-1C.

## Logger

`SubmissionLogger` prefixes `[submission]` with optional `submissionNo` / `submissionId` / `phase`. `debug()` is skipped in production.

## Future Wiring (not in 29-1C)

1. API routes import `defaultSubmissionRepository` / `defaultSubmissionUploadManager`
2. Replace inline Supabase calls with repository methods
3. Add idempotency table + real `IdempotencyStore`
4. Expose `GET /api/submissions/:id/status` using lifecycle types

## Validation

```bash
node scripts/validate-submission-foundation-29-1c.mjs
```
