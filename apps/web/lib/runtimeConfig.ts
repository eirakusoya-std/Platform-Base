function parseCsv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export type RuntimeConfig = {
  appUrl: string;
  allowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
  authRateLimitMax: number;
  reservationRateLimitMax: number;
};

export function getRuntimeConfig(): RuntimeConfig {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const configuredOrigins = parseCsv(process.env.AIMENT_ALLOWED_ORIGINS);
  const allowedOrigins = Array.from(
    new Set([
      appUrl,
      ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000", "http://127.0.0.1:3000"] : []),
      ...configuredOrigins,
    ]),
  );

  return {
    appUrl,
    allowedOrigins,
    rateLimitWindowMs: parsePositiveInt(process.env.AIMENT_RATE_LIMIT_WINDOW_MS, 60_000),
    rateLimitMax: parsePositiveInt(process.env.AIMENT_RATE_LIMIT_MAX, 120),
    authRateLimitMax: parsePositiveInt(process.env.AIMENT_AUTH_RATE_LIMIT_MAX, 20),
    reservationRateLimitMax: parsePositiveInt(process.env.AIMENT_RESERVATION_RATE_LIMIT_MAX, 30),
  };
}

export function isAllowedOrigin(origin: string | null, config: RuntimeConfig) {
  if (!origin) return true;
  return config.allowedOrigins.includes(origin);
}
