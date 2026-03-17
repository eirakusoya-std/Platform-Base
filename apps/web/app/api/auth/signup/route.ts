import { NextResponse } from "next/server";
import type { SignupInput } from "@/app/lib/apiTypes";
import { signupUser } from "@/app/lib/server/aimentStore";
import { withSessionCookie } from "@/app/lib/server/auth";
import { recordConsent, recordMonitoringEvent } from "@/app/lib/server/opsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupInput;
    const user = await signupUser(body);
    if (user.termsAcceptedAt && user.privacyAcceptedAt) {
      await recordConsent(user.id, {
        version: process.env.AIMENT_TERMS_VERSION?.trim() || "2026-03-12",
        source: "signup",
        termsAcceptedAt: user.termsAcceptedAt,
        privacyAcceptedAt: user.privacyAcceptedAt,
      });
    }
    const response = NextResponse.json({ user, isAuthenticated: true }, { status: 201 });
    return withSessionCookie(response, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sign up";
    await recordMonitoringEvent({
      source: "api",
      level: "error",
      code: "auth.signup.failed",
      message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
