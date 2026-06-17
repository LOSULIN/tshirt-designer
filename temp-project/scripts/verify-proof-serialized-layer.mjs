/**
 * 驗證：序列化 image layer（無 layer.image）可通過 buildLiveDesignState / Proof PDF。
 */

import { existsSync, readFileSync } from "node:fs";
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

const liveStateSrc = readFileSync(join(root, "lib/live-design-state.ts"), "utf8");
assert(
  liveStateSrc.includes("layer.fileName ?? layer.image?.fileName"),
  "getElementContent 支援序列化 fileName 與 layer.image.fileName",
);

const serializedImageLayer = {
  id: "img-1",
  name: "圖片 1",
  type: "image",
  visible: true,
  locked: false,
  zIndex: 0,
  x_cm: 10,
  y_cm: 12,
  width_cm: 20,
  height_cm: 20,
  scale: 1,
  rotation: 0,
  fileName: "design.png",
  mimeType: "image/png",
};

const legacyImageLayer = {
  ...serializedImageLayer,
  fileName: undefined,
  image: { fileName: "legacy.png", mimeType: "image/png" },
};

function resolveFileName(layer) {
  if (layer.type !== "image") return layer.name;
  return layer.fileName ?? layer.image?.fileName ?? layer.name;
}

assert(
  resolveFileName(serializedImageLayer) === "design.png",
  "新格式 layer.fileName 可解析",
);
assert(
  resolveFileName(legacyImageLayer) === "legacy.png",
  "舊格式 layer.image.fileName 可解析",
);

async function runRuntimeChecks() {
  const { buildLiveDesignState } = await import(
    join(root, "lib/live-design-state.ts")
  );
  const state = buildLiveDesignState([serializedImageLayer], "M");
  assert(
    state.elements[0]?.content === "design.png",
    "buildLiveDesignState 不因序列化 image layer 拋錯",
  );

  const { generateProofPdf } = await import(
    join(root, "lib/proof-engine/generators/proof-pdf-generator.ts")
  );

  const tinyPng = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  );

  const order = {
    order_id: "test-order",
    submission_no: "FD-TEST-0001",
    gender: "male",
    active_side: "front",
    shirt_color: "white",
    size: "M",
    layers_by_template: {
      male: { front: [serializedImageLayer], back: [] },
      female: { front: [], back: [] },
      "child-male": { front: [], back: [] },
      "child-female": { front: [], back: [] },
    },
    created_at: new Date().toISOString(),
  };

  const pdfBytes = await generateProofPdf({
    order,
    version: 1,
    mockupImages: { front: tinyPng },
    printImages: { front: tinyPng },
  });

  assert(
    pdfBytes instanceof Uint8Array && pdfBytes.length > 1000,
    `generateProofPdf 產生 PDF（${pdfBytes.length} bytes）`,
  );

  await testGenerateProofDocuments(serializedImageLayer, tinyPng);
}

function loadEnvLocal() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function testGenerateProofDocuments(serializedImageLayer, tinyPng) {
  loadEnvLocal();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("⊘ 略過 generateProofDocuments（無 Supabase 環境變數）");
    return;
  }

  const { createAdminClient } = await import(join(root, "lib/supabase/admin.ts"));
  const { generateProofDocuments } = await import(
    join(root, "lib/proof-engine/generate-proof.ts")
  );
  const { allocateSubmissionNo } = await import(join(root, "lib/submission-no.ts"));
  const { buildOrderStoragePath } = await import(
    join(root, "lib/proof-engine/storage-manager.ts")
  );

  const supabase = createAdminClient();
  const submissionNo = await allocateSubmissionNo(supabase, "FD");
  const orderId = `verify-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const layersByTemplate = {
    male: { front: [serializedImageLayer], back: [] },
    female: { front: [], back: [] },
    "child-male": { front: [], back: [] },
    "child-female": { front: [], back: [] },
  };

  const { error: insertError } = await supabase.from("design_submissions").insert({
    id: orderId,
    created_at: createdAt,
    template_type: "male",
    side: "front",
    status: "submitted",
    storage_path: buildOrderStoragePath(submissionNo),
    expires_at: null,
    submission_type: "normal",
    review_status: null,
    submission_no: submissionNo,
    shirt_color: "white",
    proof_version: 1,
  });

  if (insertError) {
    throw new Error(`測試 insert 失敗：${insertError.message}`);
  }

  const order = {
    order_id: orderId,
    submission_no: submissionNo,
    gender: "male",
    active_side: "front",
    shirt_color: "white",
    size: "M",
    layers_by_template: layersByTemplate,
    created_at: createdAt,
  };

  const artifacts = {
    mockups: { front: tinyPng },
    prints: { front: tinyPng },
  };

  const internalFiles = {
    designJson: JSON.stringify({ layersByTemplate }),
    applicantJson: JSON.stringify({
      applicantName: "測試",
      applicantEmail: "test@example.com",
    }),
  };

  const { package: proofPackage } = await generateProofDocuments(
    order,
    1,
    artifacts,
    { supabase },
    internalFiles,
  );

  assert(Boolean(proofPackage.pdf_url), "generateProofDocuments 回傳 pdf_url");

  const { data: row, error: readError } = await supabase
    .from("design_submissions")
    .select("proof_pdf_url, proof_package")
    .eq("id", orderId)
    .single();

  if (readError) {
    throw new Error(`讀取 proof 欄位失敗：${readError.message}`);
  }

  await supabase.from("design_submissions").update({
    storage_path: proofPackage.storage_path,
    proof_pdf_url: proofPackage.pdf_url,
    proof_package: proofPackage,
  }).eq("id", orderId);

  const { data: updated } = await supabase
    .from("design_submissions")
    .select("proof_pdf_url")
    .eq("id", orderId)
    .single();

  assert(Boolean(updated?.proof_pdf_url), "proof_pdf_url 可寫入資料庫");

  await supabase.from("design_submissions").delete().eq("id", orderId);
  console.log(`✓ generateProofDocuments 整合測試完成（${submissionNo}）`);
}

try {
  await runRuntimeChecks();
  console.log("\nProof pipeline 序列化 layer 驗證完成。");
} catch (error) {
  console.error("✗", error);
  process.exitCode = 1;
}
