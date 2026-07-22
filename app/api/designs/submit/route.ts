import { after, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  extractShirtColorFromDesignJson,
  normalizeShirtColor,
} from "@/lib/shirt-color";
import {
  buildOrderStoragePath,
  generateProofDocuments,
  hasProofArtifacts,
  parseProofArtifactsFromFormData,
  SubmitTiming,
  type ProofOrder,
} from "@/lib/proof-engine/server";
import {
  createSubmissionLogger,
  defaultSubmissionRepository,
  defaultSubmissionUploadManager,
} from "@/lib/submission";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeProofSubmitRuntimeContext,
  parseProofSubmitRuntimeContextFromFormData,
} from "@/lib/designer-geometry-v2/proof-submit-runtime-context";

export const runtime = "nodejs";
export const maxDuration = 300;

const log = createSubmissionLogger({ phase: "designs-submit" });

const PROOF_VERSION = 1;

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function originalFilename(ext: string, submissionNo: string) {
  return `original-${submissionNo}.${ext}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const syncTiming = new SubmitTiming("sync", "pending");

    const designJson = formData.get("designJson");
    const textJson = formData.get("textJson");
    const applicantJson = formData.get("applicantJson");
    const original = formData.get("original");

    if (typeof designJson !== "string") {
      return NextResponse.json(
        { error: "缺少設計設定" },
        { status: 400 },
      );
    }

    const config = JSON.parse(designJson) as {
      templateType: string;
      side: string;
      activeGender?: string;
      activeSide?: string;
      shirtColor?: string;
      size?: string;
      layersByTemplate?: ProofOrder["layers_by_template"];
    };

    const proofRuntimeContext = normalizeProofSubmitRuntimeContext(
      parseProofSubmitRuntimeContextFromFormData(formData),
    );

    const artifacts = await parseProofArtifactsFromFormData(formData);
    if (!hasProofArtifacts(artifacts)) {
      return NextResponse.json(
        { error: "缺少 Proof Engine 校稿檔案，請重新送出" },
        { status: 400 },
      );
    }

    const applicant =
      typeof applicantJson === "string"
        ? (JSON.parse(applicantJson) as ProofOrder["applicant"])
        : null;

    const templateType = config.activeGender ?? config.templateType;
    const side = (config.activeSide ?? config.side) as ProofOrder["active_side"];
    const shirtColor = normalizeShirtColor(
      config.shirtColor ?? extractShirtColorFromDesignJson(designJson),
    );
    const size = (config.size ?? "M") as ProofOrder["size"];

    if (!config.layersByTemplate) {
      return NextResponse.json(
        { error: "設計資料不完整（缺少 layersByTemplate）" },
        { status: 400 },
      );
    }

    syncTiming.mark("parseFormData");

    const orderId = nanoid(12);
    const createdAt = new Date().toISOString();
    const supabase = createAdminClient();
    const ctx = { supabase };

    let submissionNo: string;
    try {
      const created = await defaultSubmissionRepository.createDesignSubmission(
        ctx,
        {
          id: orderId,
          created_at: createdAt,
          template_type: templateType,
          side,
          storage_path: "",
          submission_type: "normal",
          submission_no: "",
          shirt_color: shirtColor,
          proof_version: PROOF_VERSION,
          review_status: null,
        },
        {
          prefix: "FD",
          resolveStoragePath: buildOrderStoragePath,
          insertFailureLog: "prefixed",
        },
      );
      submissionNo = created.submissionNo;
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "寫入資料庫失敗：未知錯誤",
        },
        { status: 500 },
      );
    }

    syncTiming.mark("saveDatabase");

    let originalFile: { buffer: Buffer; filename: string } | undefined;
    if (original instanceof Blob && original.size > 0) {
      const originalExt = extFromMime(original.type || "image/png");
      originalFile = {
        buffer: Buffer.from(await original.arrayBuffer()),
        filename: originalFilename(originalExt, submissionNo),
      };
    }

    const proofOrder: ProofOrder = {
      order_id: orderId,
      submission_no: submissionNo,
      gender: templateType as ProofOrder["gender"],
      active_side: side,
      shirt_color: shirtColor,
      size,
      layers_by_template: config.layersByTemplate,
      applicant,
      created_at: createdAt,
    };

    const internalFiles = {
      designJson,
      textJson: typeof textJson === "string" ? textJson : undefined,
      applicantJson:
        typeof applicantJson === "string" ? applicantJson : undefined,
      original: originalFile,
    };

    await defaultSubmissionUploadManager.uploadFiles({
      ctx,
      submissionNo,
      internalFiles,
      artifacts,
    });
    syncTiming.finish("uploadFiles");
    syncTiming.setOrderRef(submissionNo);
    syncTiming.log();

    after(async () => {
      const bgTiming = new SubmitTiming("background", submissionNo);
      try {
        const { package: proofPackage, email } = await generateProofDocuments(
          proofOrder,
          PROOF_VERSION,
          artifacts,
          ctx,
          internalFiles,
          bgTiming,
          proofRuntimeContext,
        );

        await supabase
          .from("design_submissions")
          .update({
            storage_path: proofPackage.storage_path,
            proof_pdf_url: proofPackage.pdf_url,
            proof_package: proofPackage,
            mockup_front_url: null,
            mockup_back_url: null,
            print_file_url: null,
          })
          .eq("id", orderId);

        bgTiming.mark("updateDatabase");
        bgTiming.log();

        if (!email.admin.sent) {
          log.warnRaw(
            `[submit-background] admin email not sent for ${submissionNo}:`,
            email.admin.message ?? email.admin.reason,
          );
        }
      } catch (error) {
        log.errorRaw(
          `[submit-background] proof pipeline failed for ${submissionNo}:`,
          error,
        );
      }
    });

    return NextResponse.json({
      submissionNo,
      orderId,
      createdAt,
      proofProcessing: true,
      timing: syncTiming.getDurations(),
    });
  } catch (error) {
    log.errorRaw(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "送出設計失敗",
      },
      { status: 500 },
    );
  }
}
