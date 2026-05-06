// SOLID: S（Google OAuth新規ユーザーの初回セットアップに専念。通常のプロフィール更新とは分離）
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/lib/server/auth";
import { updateAccountSetup } from "@/app/lib/server/aimentStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const currentUser = await requireSessionUser();

    // Google OAuth 新規ユーザー以外はこのエンドポイントを使えない
    if (currentUser.authProvider !== "google") {
      return NextResponse.json({ error: "This endpoint is for Google OAuth users only" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      role?: "listener" | "vtuber";
      name?: string;
      channelName?: string;
    };

    const user = await updateAccountSetup(currentUser.id, {
      role: body.role,
      name: body.name,
      channelName: body.channelName,
    });

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
