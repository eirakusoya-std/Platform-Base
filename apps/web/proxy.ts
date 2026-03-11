import { NextResponse, type NextRequest } from "next/server";
import { getRuntimeConfig, isAllowedOrigin } from "./lib/runtimeConfig";

type BucketState = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, BucketState>();

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function getRateLimitMax(pathname: string, config: ReturnType<typeof getRuntimeConfig>) {
  if (pathname.startsWith("/api/auth/")) return config.authRateLimitMax;
  if (pathname.startsWith("/api/reservations")) return config.reservationRateLimitMax;
  return config.rateLimitMax;
}

function applyCorsHeaders(response: NextResponse, origin: string | null) {
  if (!origin) return response;

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Vary", "Origin");
  return response;
}

function checkRateLimit(request: NextRequest, config: ReturnType<typeof getRuntimeConfig>) {
  const now = Date.now();
  const pathname = request.nextUrl.pathname;
  const key = `${getClientIp(request)}:${pathname}:${request.method}`;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const nextState = { count: 1, resetAt: now + config.rateLimitWindowMs };
    rateLimitStore.set(key, nextState);
    return { allowed: true, remaining: getRateLimitMax(pathname, config) - 1, resetAt: nextState.resetAt };
  }

  const max = getRateLimitMax(pathname, config);
  if (existing.count >= max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return { allowed: true, remaining: Math.max(0, max - existing.count), resetAt: existing.resetAt };
}

export function proxy(request: NextRequest) {
  const config = getRuntimeConfig();
  const origin = request.headers.get("origin");

  if (!isAllowedOrigin(origin, config)) {
    return NextResponse.json({ error: "Origin is not allowed" }, { status: 403 });
  }

  if (request.method === "OPTIONS") {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  const result = checkRateLimit(request, config);
  if (!result.allowed) {
    const response = NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))),
        },
      },
    );
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", String(result.resetAt));
    return applyCorsHeaders(response, origin);
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.resetAt));
  return applyCorsHeaders(response, origin);
}

export const config = {
  matcher: ["/api/:path*"],
};
