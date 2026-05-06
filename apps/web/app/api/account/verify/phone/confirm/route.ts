// SOLID: S（電話番号コード照合と総当たり対策に専念）
import { NextResponse } from "next/server";
import { confirmPhoneVerification } from "@/app/lib/server/aimentStore";
import { requireSessionUser } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15分

// userId → { count, lockedUntil }
const attempts = new Map<string, { count: number; lockedUntil: number }>();

function checkAttempt(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = attempts.get(userId);
  if (entry && entry.lockedUntil > now) {
    return { allowed: false, remaining: 0 };
  }
  if (entry && entry.lockedUntil <= now) {
    attempts.delete(userId);
  }
  const current = attempts.get(userId);
  const count = (current?.count ?? 0);
  return { allowed: count < MAX_ATTEMPTS, remaining: MAX_ATTEMPTS - count };
}

function recordFailure(userId: string): void {
  const now = Date.now();
  const current = attempts.get(userId) ?? { count: 0, lockedUntil: 0 };
  const count = current.count + 1;
  attempts.set(userId, {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0,
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();

    const { allowed, remaining } = checkAttempt(user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: `試行回数の上限を超えました。15分後に再試行してください。` },
        { status: 429 },
      );
    }

    const body = (await request.json().catch(() => null)) as { code?: string } | null;
    try {
      const nextUser = await confirmPhoneVerification(user.id, body?.code ?? "");
      attempts.delete(user.id);
      return NextResponse.json({ user: nextUser });
    } catch (verifyError) {
      recordFailure(user.id);
      const newRemaining = remaining - 1;
      const message = verifyError instanceof Error ? verifyError.message : "コードが一致しません";
      return NextResponse.json(
        { error: `${message}（残り${newRemaining}回）` },
        { status: 400 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify phone";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
