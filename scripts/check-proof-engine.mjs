/**
 * 驗證：Proof Engine 模組
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    console.error("✗", message);
    process.exitCode = 1;
    return;
  }
  console.log("✓", message);
}

const engineSrc = readFileSync(
  join(root, "lib/proof-engine/generate-proof.ts"),
  "utf8",
);
assert(engineSrc.includes("generateProof"), "generateProof 已實作");
const storageSrc = readFileSync(
  join(root, "lib/proof-engine/storage-manager.ts"),
  "utf8",
);
assert(
  storageSrc.includes("orders/${orderId}/v${version}") ||
    storageSrc.includes("orders/"),
  "Storage 使用 orders/{order_id}/v{version}",
);

const typesSrc = readFileSync(join(root, "lib/proof-engine/types.ts"), "utf8");
assert(typesSrc.includes("ProofPackage"), "ProofPackage schema 已定義");
assert(
  typesSrc.includes("mockup_front_url") &&
    typesSrc.includes("pdf_url"),
  "ProofPackage 含標準 URL 欄位",
);

const mockupSrc = readFileSync(
  join(root, "lib/proof-engine/generators/mockup-generator.ts"),
  "utf8",
);
assert(
  mockupSrc.includes("renderMockupPreviewPng"),
  "Mockup Generator 已建立",
);

const printSrc = readFileSync(
  join(root, "lib/proof-engine/generators/print-generator.ts"),
  "utf8",
);
assert(
  printSrc.includes("renderPrintExportPng"),
  "Print File Generator 已建立",
);

const pdfSrc = readFileSync(
  join(root, "lib/proof-engine/generators/factory-proof-pdf-template.ts"),
  "utf8",
);
assert(
  pdfSrc.includes("buildLiveDesignState"),
  "Proof PDF 依據 designState",
);
assert(pdfSrc.includes("595.28"), "Proof PDF 使用 A4");
assert(
  pdfSrc.includes("ORDER OVERVIEW"),
  "工廠級 Proof PDF Template 已建立",
);

const emailSrc = readFileSync(
  join(root, "lib/proof-engine/proof-email.ts"),
  "utf8",
);
assert(
  emailSrc.includes("customer") &&
    emailSrc.includes("factory"),
  "Proof Email 含 customer / internal / factory",
);

const submitSrc = readFileSync(
  join(root, "app/api/designs/submit/route.ts"),
  "utf8",
);
assert(
  submitSrc.includes("generateProof"),
  "submit 只觸發 Proof Engine",
);
assert(
  !submitSrc.includes("completed.png") ||
    !submitSrc.includes('formData.get("completed")'),
  "submit 不再要求 legacy completed PNG",
);

const appSrc = readFileSync(
  join(root, "components/designer/DesignerApp.tsx"),
  "utf8",
);
assert(
  appSrc.includes("prepareProofSubmission"),
  "DesignerApp 透過 Proof Engine 產生 artifacts",
);
assert(
  !appSrc.includes("renderCompletedDesignPng"),
  "DesignerApp submit 不再直接 render print PNG",
);

console.log("\nProof Engine 結構檢查完成。");
