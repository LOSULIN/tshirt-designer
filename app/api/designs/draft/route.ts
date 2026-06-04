import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { DRAFT_TTL_MS } from "@/lib/constants";
import { createAdminClient, DESIGNS_BUCKET } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const draftId = (formData.get("draftId") as string) || nanoid(12);
    const designJson = formData.get("designJson");
    const textJson = formData.get("textJson");
    const preview = formData.get("preview");

    if (typeof designJson !== "string") {
      return NextResponse.json({ error: "缺少設計設定" }, { status: 400 });
    }

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + DRAFT_TTL_MS);
    const basePath = `drafts/${draftId}`;
    const supabase = createAdminClient();

    const configBuffer = Buffer.from(designJson, "utf-8");
    const { error: jsonError } = await supabase.storage
      .from(DESIGNS_BUCKET)
      .upload(`${basePath}/design.json`, configBuffer, {
        contentType: "application/json",
        upsert: true,
      });

    if (jsonError) {
      return NextResponse.json(
        { error: jsonError.message },
        { status: 500 },
      );
    }

    if (typeof textJson === "string" && textJson.length > 0) {
      const textBuffer = Buffer.from(textJson, "utf-8");
      await supabase.storage
        .from(DESIGNS_BUCKET)
        .upload(`${basePath}/texts.json`, textBuffer, {
          contentType: "application/json",
          upsert: true,
        });
    }

    if (preview instanceof Blob && preview.size > 0) {
      const previewBuffer = Buffer.from(await preview.arrayBuffer());
      await supabase.storage
        .from(DESIGNS_BUCKET)
        .upload(`${basePath}/preview.png`, previewBuffer, {
          contentType: "image/png",
          upsert: true,
        });
    }

    const original = formData.get("original");
    if (original instanceof Blob && original.size > 0) {
      const ext = original.type === "image/png" ? "png" : "jpg";
      const originalBuffer = Buffer.from(await original.arrayBuffer());
      await supabase.storage
        .from(DESIGNS_BUCKET)
        .upload(`${basePath}/original.${ext}`, originalBuffer, {
          contentType: original.type || "application/octet-stream",
          upsert: true,
        });
    }

    await supabase.from("design_submissions").upsert(
      {
        id: draftId,
        created_at: createdAt.toISOString(),
        template_type: JSON.parse(designJson).templateType,
        side: JSON.parse(designJson).side,
        status: "draft",
        storage_path: basePath,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "id" },
    );

    return NextResponse.json({
      draftId,
      savedAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "暫存失敗",
      },
      { status: 500 },
    );
  }
}
