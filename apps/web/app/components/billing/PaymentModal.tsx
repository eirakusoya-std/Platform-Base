"use client";

// SOLID: S（決済UIの表示責任をAccountページから分離し、単一コンポーネントに集約）
import { type FormEvent, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PaymentFormProps = {
  onSuccess: () => void;
  onClose: () => void;
};

function PaymentForm({ onSuccess, onClose }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "決済に失敗しました。");
      setLoading(false);
      return;
    }

    onSuccess();
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      <PaymentElement />
      {errorMessage ? (
        <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
      ) : null}
      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={!stripe || loading}
          className="h-11 flex-1 rounded-lg bg-[var(--brand-secondary)] text-sm font-semibold text-[var(--brand-bg-900)] disabled:opacity-60"
        >
          {loading ? "処理中..." : "支払う"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="h-11 rounded-lg bg-[var(--brand-surface-soft)] px-4 text-sm text-[var(--brand-text)] disabled:opacity-60"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

export type PaymentModalProps = {
  clientSecret: string;
  title: string;
  onSuccess: () => void;
  onClose: () => void;
};

export function PaymentModal({ clientSecret, title, onSuccess, onClose }: PaymentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--brand-bg-900)] p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold text-[var(--brand-text)]">{title}</h2>
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: "night" } }}
        >
          <PaymentForm onSuccess={onSuccess} onClose={onClose} />
        </Elements>
      </div>
    </div>
  );
}
