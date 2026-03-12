import { getRuntimeConfig } from "@/lib/runtimeConfig";

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

export function getStripePriceId(plan: "supporter" | "premium") {
  return plan === "premium" ? process.env.STRIPE_PRICE_PREMIUM?.trim() : process.env.STRIPE_PRICE_SUPPORTER?.trim();
}

export function getBillingSuccessUrl() {
  return `${getRuntimeConfig().appUrl}/account?billing=success`;
}

export function getBillingCancelUrl() {
  return `${getRuntimeConfig().appUrl}/account?billing=cancel`;
}
