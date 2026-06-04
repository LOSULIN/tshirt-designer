import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { sendDesignSubmittedEmail } from "@/lib/email";
import { createAdminClient, DESIGNS_BUCKET } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function extFromMime(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const completed = formData.get("completed");
    const original = formData.get("original");
    const designJson = formData.get("designJson");
    const textJson = formData.get("textJson");

    if (!(completed instanceof Blob)) {
      return NextResponse.json(
        { error: "缺少設計完成圖" },
        { status: 400 },
      );
    }

    if (typeof designJson !== "string") {
      return NextResponse.json(
        { error: "缺少設計設定" },
        { status: 400 },
      );
    }

    const config = JSON.parse(designJson) as {
      templateType: string;
      side: string;
    };

    const designId = nanoid(12);
    const createdAt = new Date().toISOString();
    const basePath = `submitted/${designId}`;
    const supabase = createAdminClient();

    const binaryUploads: {
      path: string;
      body: Blob;
      contentType: string;
    }[] = [
      {
        path: `${basePath}/completed.png`,
        body: completed,
        contentType: "image/png",
      },
    ];

    if (original instanceof Blob && original.size > 0) {
      const originalExt = extFromMime(original.type || "image/png");
      binaryUploads.push({
        path: `${basePath}/original.${originalExt}`,
        body: original,
        contentType: original.type || "application/octet-stream",
      });
    }

    for (const file of binaryUploads) {
      const buffer = Buffer.from(await file.body.arrayBuffer());
      const { error } = await supabase.storage
        .from(DESIGNS_BUCKET)
        .upload(file.path, buffer, {
          contentType: file.contentType,
          upsert: false,
        });

      if (error) {
        return NextResponse.json(
          { error: `上傳失敗: ${error.message}` },
          { status: 500 },
        );
      }
    }

    const jsonUploads: { path: string; body: string; contentType: string }[] = [
      {
        path: `${basePath}/design.json`,
        body: designJson,
        contentType: "application/json",
      },
    ];

    if (typeof textJson === "string" && textJson.length > 0) {
      jsonUploads.push({
        path: `${basePath}/texts.json`,
        body: textJson,
        contentType: "application/json",
      });
    }

    for (const file of jsonUploads) {
      const buffer = Buffer.from(file.body, "utf-8");
      const { error } = await supabase.storage
        .from(DESIGNS_BUCKET)
        .upload(file.path, buffer, {
          contentType: file.contentType,
          upsert: false,
        });

      if (error) {
        return NextResponse.json(
          { error: `上傳失敗: ${error.message}` },
          { status: 500 },
        );
      }
    }

    const allPaths = [
      ...binaryUploads.map((f) => f.path),
      ...jsonUploads.map((f) => f.path),
    ];

    const signedUrls = await Promise.all(
      allPaths.map(async (path) => {
        const { data, error } = await supabase.storage
          .from(DESIGNS_BUCKET)
          .createSignedUrl(path, 60 * 60 * 24 * 7);

        if (error || !data?.signedUrl) {
          throw new Error(error?.message ?? "無法建立檔案連結");
        }

        return data.signedUrl;
      }),
    );

    const fileMap: Record<string, string> = {};
    allPaths.forEach((path, index) => {
      if (path.endsWith("completed.png")) fileMap.completed = signedUrls[index];
      else if (path.includes("/original.")) fileMap.original = signedUrls[index];
      else if (path.endsWith("design.json")) fileMap.config = signedUrls[index];
      else if (path.endsWith("texts.json")) fileMap.texts = signedUrls[index];
    });

    await supabase.from("design_submissions").insert({
      id: designId,
      created_at: createdAt,
      template_type: config.templateType,
      side: config.side,
      status: "submitted",
      storage_path: basePath,
      expires_at: null,
    });

    await sendDesignSubmittedEmail({
      designId,
      createdAt,
      templateType: config.templateType,
      side: config.side,
      fileLinks: {
        completed: fileMap.completed,
        original: fileMap.original ?? fileMap.completed,
        config: fileMap.config,
        texts: fileMap.texts,
      },
    });

    return NextResponse.json({
      designId,
      createdAt,
      files: {
        completed: fileMap.completed,
        original: fileMap.original,
        config: fileMap.config,
        texts: fileMap.texts,
      },
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
