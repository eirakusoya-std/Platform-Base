// SOLID: S（サムネイル画像のVercel Blobアップロードに専念）
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request) {
  try {
    await requireSessionUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "JPG / PNG / WebP / GIF のみ対応しています" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "ファイルサイズは4MB以下にしてください" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `thumbnails/${Date.now()}.${ext}`;

    const blob = await put(filename, file, { access: "public" });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
