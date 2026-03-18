import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { UserRole } from "@/app/lib/apiTypes";
import { googleAuthUser } from "@/app/lib/server/aimentStore";
import { withSessionCookie } from "@/app/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoogleTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
};

type GoogleUserInfo = {
  sub: string;
  name: string;
  email: string;
  email_verified: boolean;
  picture?: string;
};

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(`${appUrl}/auth?error=${encodeURIComponent(oauthError)}`);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;

  if (!code || !stateParam || !storedState) {
    return NextResponse.redirect(`${appUrl}/auth?error=missing_params`);
  }

  const [state, roleRaw] = stateParam.split(":");
  if (state !== storedState) {
    return NextResponse.redirect(`${appUrl}/auth?error=invalid_state`);
  }

  const role: UserRole = roleRaw === "vtuber" ? "vtuber" : "listener";

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${appUrl}/api/auth/callback/google`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${appUrl}/auth?error=token_exchange_failed`);
    }

    const tokens = (await tokenRes.json()) as GoogleTokenResponse;

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      return NextResponse.redirect(`${appUrl}/auth?error=userinfo_failed`);
    }

    const googleUser = (await userInfoRes.json()) as GoogleUserInfo;

    if (!googleUser.email_verified) {
      return NextResponse.redirect(`${appUrl}/auth?error=email_not_verified`);
    }

    const user = await googleAuthUser({
      googleSub: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      avatarUrl: googleUser.picture,
      role,
    });

    const response = NextResponse.redirect(`${appUrl}/account`);
    response.cookies.set("google_oauth_state", "", { maxAge: 0, path: "/" });
    return withSessionCookie(response, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "auth_failed";
    return NextResponse.redirect(`${appUrl}/auth?error=${encodeURIComponent(message)}`);
  }
}
