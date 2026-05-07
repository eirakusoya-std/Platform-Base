"use client";

// SOLID: S（アーリーアクセス専用の決済フローに専念）
import { type FormEvent, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type Step = "form" | "payment" | "success";

function PaymentForm({
  onSuccess,
  onBack,
}: {
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "決済に失敗しました。");
      setLoading(false);
      return;
    }

    if (paymentIntent?.id) {
      await fetch("/api/early-access/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      }).catch(() => null);
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <PaymentElement />
      {error ? <p className="text-sm text-[var(--brand-accent)]">{error}</p> : null}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-lg bg-[var(--brand-secondary)] py-3 text-sm font-semibold text-[var(--brand-bg-900)] disabled:opacity-60"
      >
        {loading ? "処理中..." : "₱200 を支払う"}
      </button>
      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="w-full rounded-lg bg-[var(--brand-surface-soft)] py-2.5 text-sm text-[var(--brand-text-muted)] disabled:opacity-60"
      >
        戻る
      </button>
    </form>
  );
}

function usePhpToJpy(phpAmount: number) {
  const [jpy, setJpy] = useState<number | null>(null);
  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=PHP&to=JPY")
      .then((r) => r.json() as Promise<{ rates?: { JPY?: number } }>)
      .then((data) => {
        const rate = data.rates?.JPY;
        if (rate) setJpy(Math.round(phpAmount * rate));
      })
      .catch(() => null);
  }, [phpAmount]);
  return jpy;
}

export default function EarlyAccessPaymentPage() {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const jpyEquiv = usePhpToJpy(200);

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/early-access/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = (await res.json()) as { clientSecret?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "エラーが発生しました");
      if (!data.clientSecret) throw new Error("決済情報の取得に失敗しました");
      setClientSecret(data.clientSecret);
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--brand-bg-900)] p-4">
        <div className="w-full max-w-md rounded-2xl bg-[var(--brand-surface)] p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-secondary)]/20">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-[var(--brand-text)]">支払い完了</h1>
          <p className="text-sm text-[var(--brand-text-muted)]">
            アーリーアクセスへの参加が確定しました。<br />
            詳細は追ってご連絡いたします。
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--brand-bg-900)] p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--brand-surface)] p-8 shadow-xl">
        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">Early Access</p>
          <h1 className="text-2xl font-bold text-[var(--brand-text)]">アーリーアクセス参加</h1>
          <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
            特別セッションへの参加費{" "}
            <span className="font-semibold text-[var(--brand-text)]">₱200</span>
            {jpyEquiv ? (
              <span className="ml-1 text-xs text-[var(--brand-text-muted)]">（約{jpyEquiv.toLocaleString()}円）</span>
            ) : null}
          </p>
        </div>

        {step === "form" && (
          <form onSubmit={(e) => void handleFormSubmit(e)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--brand-text)]">
                お名前 <span className="text-[var(--brand-accent)]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="山田 太郎"
                className="w-full rounded-lg border border-[var(--brand-surface-soft)] bg-[var(--brand-bg-900)] px-4 py-2.5 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--brand-text)]">
                メールアドレス <span className="text-[var(--brand-accent)]">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[var(--brand-surface-soft)] bg-[var(--brand-bg-900)] px-4 py-2.5 text-sm text-[var(--brand-text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            {error ? <p className="text-sm text-[var(--brand-accent)]">{error}</p> : null}
            <button
              type="submit"
              disabled={loading || !name.trim() || !email.trim()}
              className="w-full rounded-lg bg-[var(--brand-primary)] py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "準備中..." : `支払いへ進む → ₱200${jpyEquiv ? `（約${jpyEquiv.toLocaleString()}円）` : ""}`}
            </button>
          </form>
        )}

        {step === "payment" && clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "night" } }}
          >
            <PaymentForm
              onSuccess={() => setStep("success")}
              onBack={() => setStep("form")}
            />
          </Elements>
        ) : null}
      </div>
    </main>
  );
}
