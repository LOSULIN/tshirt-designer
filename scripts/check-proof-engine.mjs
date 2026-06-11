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
assert(
  engineSrc.includes("uploadSubmissionFiles"),
  "同步階段上傳申請檔案",
);
assert(
  engineSrc.includes("generateProofDocuments"),
  "背景階段產生 PDF / ZIP / Email",
);
assert(
  engineSrc.includes("buildDesignPackageZip"),
  "產生完整設計包 ZIP",
);

const storageSrc = readFileSync(
  join(root, "lib/proof-engine/storage-manager.ts"),
  "utf8",
);
assert(
  storageSrc.includes("orders/${submissionNo}"),
  "Storage 使用 orders/{submission_no}",
);
assert(
  storageSrc.includes("-proof.pdf"),
  "Proof PDF 檔名為 {submission_no}-proof.pdf",
);

const zipSrc = readFileSync(
  join(root, "lib/proof-engine/design-package-zip.ts"),
  "utf8",
);
assert(
  zipSrc.includes("mockupFront") || zipSrc.includes("mockup-front"),
  "ZIP 含 mockup 圖檔",
);
assert(zipSrc.includes("-proof.pdf"), "ZIP 含 Proof PDF");
assert(
  zipSrc.includes("validation-report.json") ||
    zipSrc.includes("validationReport"),
  "ZIP 含 validation-report.json",
);
const validationReportSrc = readFileSync(
  join(root, "lib/proof-engine/validation-report.ts"),
  "utf8",
);
assert(
  validationReportSrc.includes("buildValidationReport"),
  "validation-report.json 內容已建立",
);
const orderJsonSrc = readFileSync(
  join(root, "lib/proof-engine/order-json.ts"),
  "utf8",
);
assert(orderJsonSrc.includes("buildOrderJson"), "order.json 內容已建立");
assert(
  orderJsonSrc.includes("printMethod") &&
    orderJsonSrc.includes("validationStatus"),
  "order.json 含生產與驗證欄位",
);
assert(
  zipSrc.includes("orderJson") || zipSrc.includes("order.json"),
  "ZIP 含 order.json",
);

const typesSrc = readFileSync(join(root, "lib/proof-engine/types.ts"), "utf8");
assert(typesSrc.includes("ProofPackage"), "ProofPackage schema 已定義");
assert(
  typesSrc.includes("pdf_url") && typesSrc.includes("zip_url"),
  "ProofPackage 含 PDF / ZIP 下載連結",
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
  pdfSrc.includes("ZIIIGO PROOF"),
  "Proof PDF 標題為 ZIIIGO",
);
assert(
  !pdfSrc.includes('drawText("CUSTOMER"'),
  "Proof PDF 不含客戶個資區塊",
);

const emailSrc = readFileSync(
  join(root, "lib/proof-engine/proof-email.ts"),
  "utf8",
);
assert(
  emailSrc.includes("sendSubmissionAdminEmail"),
  "單一管理員寄信流程",
);
assert(
  emailSrc.includes("新設計申請"),
  "信件主旨為新設計申請",
);
assert(
  !emailSrc.includes("工廠印刷檔"),
  "已取消工廠印刷檔信件",
);
assert(
  !emailSrc.includes("Proof Engine｜"),
  "已取消 Proof Engine 重複信件",
);
assert(
  emailSrc.includes("zip_url"),
  "信件含 ZIP 下載連結",
);

const submitSrc = readFileSync(
  join(root, "app/api/designs/submit/route.ts"),
  "utf8",
);
assert(
  submitSrc.includes("uploadSubmissionFiles"),
  "submit 同步上傳申請檔案",
);
assert(
  submitSrc.includes("generateProofDocuments"),
  "submit 背景產生 Proof 文件",
);
assert(
  submitSrc.includes("after("),
  "submit 使用 after() 非阻塞背景任務",
);
assert(
  submitSrc.includes("proofProcessing"),
  "submit 立即回傳處理中狀態",
);

const appSrc = readFileSync(
  join(root, "components/designer/DesignerApp.tsx"),
  "utf8",
);
assert(
  appSrc.includes("prepareProofSubmission"),
  "DesignerApp 透過 Proof Engine 產生 artifacts",
);

console.log("\nProof Engine 結構檢查完成。");
