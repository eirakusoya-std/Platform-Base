"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStreamSession } from "../../../lib/streamSessions";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type Step = "loading" | "payment" | "success" | "already_reserved" | "error";

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

function PaymentForm({
  sessionId,
  onSuccess,
  onBack,
  amountPhp,
}: {
  sessionId: string;
  onSuccess: () => void;
  onBack: () => void;
  amountPhp: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const jpyEquiv = usePhpToJpy(amountPhp);

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

    if (!paymentIntent?.id) {
      setError("決済情報が取得できませんでした。");
      setLoading(false);
      return;
    }

    // 支払い完了後に予約を作成
    try {
      const res = await fetch(`/api/stream-sessions/${encodeURIComponent(sessionId)}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "speaker", paymentIntentId: paymentIntent.id }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        // 重複予約はOK（既に予約済みなら成功扱い）
        if (!data.error?.includes("already have")) {
          setError(data.error ?? "予約の作成に失敗しました。");
          setLoading(false);
          return;
        }
      }
      onSuccess();
    } catch {
      setError("予約の作成に失敗しました。");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <PaymentElement />
      {error ? <p className="text-sm text-[var(--brand-accent)]">{error}</p> : null}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-lg bg-[var(--brand-primary)] py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading
          ? "処理中..."
          : `₱${amountPhp}${jpyEquiv ? `（約${jpyEquiv.toLocaleString()}円）` : ""} を支払う`}
      </button>
      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="w-full rounded-lg bg-[var(--brand-surface)] py-2.5 text-sm text-[var(--brand-text-muted)] disabled:opacity-60"
      >
        戻る
      </button>
    </form>
  );
}

export default function SpeakerCheckoutPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? "";

  const [step, setStep] = useState<Step>("loading");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountPhp, setAmountPhp] = useState(200);
  const [sessionTitle, setSessionTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const jpyEquiv = usePhpToJpy(amountPhp);

  useEffect(() => {
    if (!sessionId) return;

    const init = async () => {
      // セッション情報取得
      const session = await getStreamSession(sessionId);
      if (!session) {
        setErrorMessage("配信枠が見つかりません。");
        setStep("error");
        return;
      }
      setSessionTitle(session.title);

      // 既に予約済みかチェック
      try {
        const resCheck = await fetch(
          `/api/stream-sessions/${encodeURIComponent(sessionId)}/reservations`,
          { cache: "no-store" },
        );
        if (resCheck.ok) {
          const data = (await resCheck.json()) as { hasSpeakerReservation?: boolean };
          if (data.hasSpeakerReservation) {
            setStep("already_reserved");
            return;
          }
        }
      } catch {
        // 未ログインなどは無視してPayment画面へ進む
      }

      // PaymentIntent 作成
      try {
        const res = await fetch("/api/billing/speaker-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json()) as { clientSecret?: string; amountPhp?: number; error?: string };
        if (!res.ok || !data.clientSecret) {
          setErrorMessage(data.error ?? "決済の準備に失敗しました。");
          setStep("error");
          return;
        }
        setClientSecret(data.clientSecret);
        if (data.amountPhp) setAmountPhp(data.amountPhp);
        setStep("payment");
      } catch {
        setErrorMessage("決済の準備に失敗しました。");
        setStep("error");
      }
    };

    void init();
  }, [sessionId]);

  const joinRoom = () => {
    router.push(`/join/${encodeURIComponent(sessionId)}`);
  };

  if (step === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--brand-bg-900)]">
        <p className="text-sm text-[var(--brand-text-muted)]">準備中...</p>
      </main>
    );
  }

  if (step === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--brand-bg-900)] p-4">
        <div className="w-full max-w-md rounded-2xl bg-[var(--brand-surface)] p-8 text-center">
          <p className="mb-4 text-sm text-[var(--brand-accent)]">{errorMessage}</p>
          <button
            onClick={() => router.push(`/join/${encodeURIComponent(sessionId)}`)}
            className="rounded-lg bg-[var(--brand-surface)] px-4 py-2 text-sm text-[var(--brand-text-muted)]"
          >
            戻る
          </button>
        </div>
      </main>
    );
  }

  if (step === "already_reserved") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--brand-bg-900)] p-4">
        <div className="w-full max-w-md rounded-2xl bg-[var(--brand-surface)] p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary)]/20">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="mb-2 text-xl font-bold text-[var(--brand-text)]">予約済みです</h1>
          <p className="mb-6 text-sm text-[var(--brand-text-muted)]">
            この枠のスピーカー枠はすでに予約されています。
          </p>
          <button
            onClick={joinRoom}
            className="w-full rounded-lg bg-[var(--brand-primary)] py-3 text-sm font-semibold text-white"
          >
            入室準備へ戻る
          </button>
        </div>
      </main>
    );
  }

  if (step === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--brand-bg-900)] p-4">
        <div className="w-full max-w-md rounded-2xl bg-[var(--brand-surface)] p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary)]/20">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="mb-2 text-xl font-bold text-[var(--brand-text)]">予約完了</h1>
          <p className="mb-1 text-sm text-[var(--brand-text-muted)]">スピーカー枠の予約が確定しました。</p>
          <p className="mb-6 text-xs text-[var(--brand-text-muted)]">{sessionTitle}</p>
          <button
            onClick={joinRoom}
            className="w-full rounded-lg bg-[var(--brand-primary)] py-3 text-sm font-semibold text-white"
          >
            入室準備へ進む
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--brand-bg-900)] p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--brand-surface)] p-8 shadow-xl">
        <div className="mb-2 flex items-center gap-3">
          <button onClick={() => router.push(`/join/${encodeURIComponent(sessionId)}`)} className="flex items-center">
            <Image src="/logo/aiment_logotype.svg" alt="aiment" width={100} height={32} className="h-7 w-auto" />
          </button>
        </div>
        <div className="mb-6 mt-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
            Speaker Fee
          </p>
          <h1 className="text-xl font-bold text-[var(--brand-text)]">スピーカー参加費のお支払い</h1>
          {sessionTitle && (
            <p className="mt-1 text-xs text-[var(--brand-text-muted)] line-clamp-1">{sessionTitle}</p>
          )}
          <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
            参加費{" "}
            <span className="font-semibold text-[var(--brand-text)]">₱{amountPhp}</span>
            {jpyEquiv ? (
              <span className="ml-1 text-xs">（約{jpyEquiv.toLocaleString()}円）</span>
            ) : null}
          </p>
        </div>

        {clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "night" } }}
          >
            <PaymentForm
              sessionId={sessionId}
              onSuccess={() => setStep("success")}
              onBack={() => router.push(`/join/${encodeURIComponent(sessionId)}`)}
              amountPhp={amountPhp}
            />
          </Elements>
        ) : null}
      </div>
    </main>
  );
}
