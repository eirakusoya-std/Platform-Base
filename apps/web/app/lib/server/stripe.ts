import { getRuntimeConfig } from "@/lib/runtimeConfig";
import type { SubscriptionPlan, TicketType } from "../apiTypes";

let stripeClientPromise: Promise<typeof import("stripe").default | null> | null = null;

async function getStripeModule() {
  if (!stripeClientPromise) {
    stripeClientPromise = import("stripe").then((mod) => mod.default).catch(() => null);
  }
  return stripeClientPromise;
}

export async function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) return null;
  const Stripe = await getStripeModule();
  if (!Stripe) return null;
  return new Stripe(secretKey);
}

type StripePriceKey = Exclude<SubscriptionPlan, "free"> | TicketType;

export function getStripePriceId(key: StripePriceKey) {
  if (key === "aimer") return process.env.STRIPE_PRICE_AIMER?.trim();
  if (key === "1on1_10min") return process.env.STRIPE_PRICE_1ON1_10MIN?.trim();
  if (key === "1on1_30min") return process.env.STRIPE_PRICE_1ON1_30MIN?.trim();
  return undefined;
}

function buildBillingUrl(returnPath: string | undefined, status: "success" | "cancel") {
  const appUrl = getRuntimeConfig().appUrl;
  const path = returnPath?.startsWith("/") && !returnPath.startsWith("//") ? returnPath : "/account";
  const url = new URL(path, appUrl);
  url.searchParams.set("billing", status);
  return url.toString();
}

export function getBillingSuccessUrl(returnPath?: string) {
  return buildBillingUrl(returnPath, "success");
}

export function getBillingCancelUrl(returnPath?: string) {
  return buildBillingUrl(returnPath, "cancel");
}
