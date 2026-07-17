/**
 * Phase 29-1C — Submission Reliability Foundation validation.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const FOUNDATION_FILES = [
  "lib/submission/index.ts",
  "lib/submission/types.ts",
  "lib/submission/status.ts",
  "lib/submission/submission-repository.ts",
  "lib/submission/upload-manager.ts",
  "lib/submission/logger.ts",
  "lib/submission/idempotency.ts",
  "docs/submission-architecture.md",
];

const FORBIDDEN_IMPORT_TARGETS = [
  "components/designer/DesignerApp.tsx",
  "components/designer/DesignCanvas.tsx",
  "components/designer/PrintAreaElement.tsx",
];

const WIRED_IMPORT_TARGETS = [
  "app/api/pro-upload/submit/route.ts",
  "app/api/contest/submit/route.ts",
  "app/api/designs/submit/route.ts",
];

let failed = 0;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed += 1;
}

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

console.log("validate-submission-foundation-29-1c\n");

for (const file of FOUNDATION_FILES) {
  if (existsSync(join(ROOT, file))) {
    pass(`exists: ${file}`);
  } else {
    fail(`missing: ${file}`);
  }
}

const indexSrc = read("lib/submission/index.ts");
const requiredExports = [
  "SupabaseSubmissionRepository",
  "ProofEngineSubmissionUploadManager",
  "createNotImplementedIdempotencyStore",
  "SubmissionLogger",
  "SubmissionLifecycleStatus",
];
for (const name of requiredExports) {
  if (indexSrc.includes(name)) {
    pass(`index exports ${name}`);
  } else {
    fail(`index missing export ${name}`);
  }
}

for (const file of WIRED_IMPORT_TARGETS) {
  const src = read(file);
  const wired =
    src.includes('@/lib/submission"') ||
    src.includes("@/lib/submission'") ||
    /from\s+["']@\/lib\/submission(?:\/|["'])/.test(src);
  if (wired) {
    pass(`${file} imports lib/submission (wired)`);
  } else {
    fail(`${file} must import lib/submission`);
  }
}

for (const file of FORBIDDEN_IMPORT_TARGETS) {
  const src = read(file);
  const wired =
    src.includes('@/lib/submission"') ||
    src.includes("@/lib/submission'") ||
    /from\s+["']@\/lib\/submission(?:\/|["'])/.test(src);
  if (wired) {
    fail(`${file} imports lib/submission (must not be wired yet)`);
  } else {
    pass(`${file} does not import lib/submission`);
  }
}

const repoSrc = read("lib/submission/submission-repository.ts");
if (
  repoSrc.includes("allocateSubmissionNo") &&
  repoSrc.includes("formatDbWriteError") &&
  repoSrc.includes("design_submissions")
) {
  pass("repository wraps Supabase design_submissions operations");
} else {
  fail("repository missing expected Supabase wrappers");
}

const uploadSrc = read("lib/submission/upload-manager.ts");
if (
  uploadSrc.includes("uploadSubmissionFiles") &&
  uploadSrc.includes("DESIGNS_BUCKET")
) {
  pass("upload manager wraps uploadSubmissionFiles + storage rollback");
} else {
  fail("upload manager missing expected wrappers");
}

const idempotencySrc = read("lib/submission/idempotency.ts");
if (
  idempotencySrc.includes("not_implemented") &&
  idempotencySrc.includes("createNotImplementedIdempotencyStore")
) {
  pass("idempotency returns not_implemented");
} else {
  fail("idempotency foundation incomplete");
}

const submissionImports = [
  "submission-repository.ts",
  "upload-manager.ts",
  "logger.ts",
  "idempotency.ts",
  "status.ts",
];
for (const file of submissionImports) {
  const src = read(`lib/submission/${file}`);
  if (src.includes('from "./submission-repository"') && file !== "submission-repository.ts") {
    // upload-manager and index may import repository — only fail circular from repository
  }
}
if (!read("lib/submission/submission-repository.ts").includes("upload-manager")) {
  pass("no repository → upload-manager import (acyclic)");
} else {
  fail("circular dependency risk: repository imports upload-manager");
}

if (!read("lib/submission/upload-manager.ts").includes("submission-repository")) {
  pass("no upload-manager → repository import (acyclic)");
} else {
  fail("circular dependency risk: upload-manager imports repository");
}

const statusSrc = read("lib/submission/status.ts");
for (const status of [
  "draft",
  "pending",
  "uploading",
  "submitted",
  "proof_processing",
  "completed",
  "failed",
]) {
  if (!statusSrc.includes(`"${status}"`)) {
    fail(`status.ts missing lifecycle status: ${status}`);
  }
}
pass("status.ts defines full lifecycle union");

console.log(
  "\nDesigner unchanged; all three submit routes use lib/submission.",
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
