import { after, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  extractShirtColorFromDesignJson,
  normalizeShirtColor,
} from "@/lib/constants";
import {
  generateProofDocuments,
  hasProofArtifacts,
  parseProofArtifactsFromFormData,
  uploadSubmissionFiles,
  type ProofOrder,
} from "@/lib/proof-engine";
import { buildOrderStoragePath } from "@/lib/proof-engine/storage-manager";
import { SubmitTiming } from "@/lib/proof-engine/submit-timing";
import {
  allocateSubmissionNo,
  isSubmissionNoConflict,
} from "@/lib/submission-no";
import { formatDbWriteError } from "@/lib/db-error";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

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

    let submissionNo = "";
    let insertError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 8; attempt++) {
      submissionNo = await allocateSubmissionNo(supabase, "FD");
      const { error } = await supabase.from("design_submissions").insert({
        id: orderId,
        created_at: createdAt,
        template_type: templateType,
        side,
        status: "submitted",
        storage_path: buildOrderStoragePath(submissionNo),
        expires_at: null,
        submission_type: "normal",
        review_status: null,
        submission_no: submissionNo,
        shirt_color: shirtColor,
        proof_version: PROOF_VERSION,
      });

      if (!error) {
        insertError = null;
        break;
      }

      insertError = error;
      if (!isSubmissionNoConflict(error) || attempt === 7) {
        console.error("design_submissions insert failed:", error);
        return NextResponse.json(
          { error: formatDbWriteError(error) },
          { status: 500 },
        );
      }
    }

    if (insertError) {
      console.error("design_submissions insert failed:", insertError);
      return NextResponse.json(
        { error: formatDbWriteError(insertError) },
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

    await uploadSubmissionFiles(
      ctx,
      submissionNo,
      internalFiles,
      artifacts,
    );
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
          console.warn(
            `[submit-background] admin email not sent for ${submissionNo}:`,
            email.admin.message ?? email.admin.reason,
          );
        }
      } catch (error) {
        console.error(
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
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "送出設計失敗",
      },
      { status: 500 },
    );
  }
}
