// SOLID: S（メール認証コード発行とSendGrid送信に専念）
import { NextResponse } from "next/server";
import { requestEmailVerification } from "@/app/lib/server/aimentStore";
import { requireSessionUser } from "@/app/lib/server/auth";
import { sendVerificationEmail } from "@/app/lib/server/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IS_DEV = process.env.NODE_ENV !== "production";

export async function POST() {
  try {
    const user = await requireSessionUser();
    if (!user.email) {
      return NextResponse.json({ error: "No email address on account" }, { status: 400 });
    }

    const result = await requestEmailVerification(user.id);

    // 本番環境ではSendGridで実際に送信し、コードはレスポンスに含めない
    await sendVerificationEmail(user.email, result.code);

    return NextResponse.json({ ok: true, ...(IS_DEV ? { devCode: result.code } : {}) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to request email verification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
