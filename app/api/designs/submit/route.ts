import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import {
  extractShirtColorFromDesignJson,
  normalizeShirtColor,
} from "@/lib/constants";
import {
  generateProof,
  hasProofArtifacts,
  parseProofArtifactsFromFormData,
  type ProofOrder,
} from "@/lib/proof-engine";
import { uploadProofFile } from "@/lib/proof-engine/storage-manager";
import { PROOF_STORAGE_FILES } from "@/lib/proof-engine/types";
import {
  allocateSubmissionNo,
  isSubmissionNoConflict,
} from "@/lib/submission-no";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PROOF_VERSION = 1;

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
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

    const orderId = nanoid(12);
    const createdAt = new Date().toISOString();
    const supabase = createAdminClient();
    const ctx = { supabase };

    await uploadProofFile(
      ctx,
      orderId,
      PROOF_VERSION,
      PROOF_STORAGE_FILES.designJson,
      designJson,
      "application/json",
    );

    if (typeof textJson === "string" && textJson.length > 0) {
      await uploadProofFile(
        ctx,
        orderId,
        PROOF_VERSION,
        "texts.json",
        textJson,
        "application/json",
      );
    }

    if (typeof applicantJson === "string" && applicantJson.length > 0) {
      await uploadProofFile(
        ctx,
        orderId,
        PROOF_VERSION,
        "applicant.json",
        applicantJson,
        "application/json",
      );
    }

    if (original instanceof Blob && original.size > 0) {
      const originalExt = extFromMime(original.type || "image/png");
      const buffer = Buffer.from(await original.arrayBuffer());
      await uploadProofFile(
        ctx,
        orderId,
        PROOF_VERSION,
        `original.${originalExt}`,
        buffer,
        original.type || "application/octet-stream",
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
        storage_path: `orders/${orderId}/v${PROOF_VERSION}`,
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
        return NextResponse.json(
          { error: "寫入資料庫失敗" },
          { status: 500 },
        );
      }
    }

    if (insertError) {
      return NextResponse.json({ error: "寫入資料庫失敗" }, { status: 500 });
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

    const { package: proofPackage, emails } = await generateProof(
      proofOrder,
      PROOF_VERSION,
      artifacts,
      ctx,
    );

    await supabase
      .from("design_submissions")
      .update({
        mockup_front_url: proofPackage.mockup_front_url,
        mockup_back_url: proofPackage.mockup_back_url,
        print_file_url: proofPackage.print_file_url,
        proof_pdf_url: proofPackage.pdf_url,
        proof_package: proofPackage,
      })
      .eq("id", orderId);

    return NextResponse.json({
      submissionNo,
      orderId,
      createdAt,
      proof: proofPackage,
      email: emails,
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
