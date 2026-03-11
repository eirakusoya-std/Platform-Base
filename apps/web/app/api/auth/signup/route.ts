import { NextResponse } from "next/server";
import type { SignupInput } from "@/app/lib/apiTypes";
import { signupUser } from "@/app/lib/server/aimentStore";
import { withSessionCookie } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupInput;
    const user = await signupUser(body);
    const response = NextResponse.json({ user, isAuthenticated: true }, { status: 201 });
    return withSessionCookie(response, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sign up";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
