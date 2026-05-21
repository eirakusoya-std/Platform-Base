"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ChevronDownIcon, MicrophoneIcon } from "@heroicons/react/24/solid";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useI18n } from "../../lib/i18n";
import { participationLabel } from "../../lib/labels";
import { getStreamSession } from "../../lib/streamSessions";
import { useUserSession } from "../../lib/userSession";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type AuthStatus = "loading" | "guest" | "logged-in";
type ReservationStatus = "loading" | "none" | "reserving" | "reserved" | "paid" | "error";

type SessionMeta = {
  id: string;
  vtuber: string;
  title: string;
  description: string;
  duration: string;
  participationType: string;
  thumbnail: string;
};

// ── Stripe payment form (inline) ──────────────────────────────────────────────
function PaymentForm({
  sessionId,
  amountPhp,
  onSuccess,
  onCancel,
}: {
  sessionId: string;
  amountPhp: number;
  onSuccess: () => void;
  onCancel: () => void;
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

    if (!paymentIntent?.id) {
      setError("決済情報が取得できませんでした。");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/stream-sessions/${encodeURIComponent(sessionId)}/reservations/confirm-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        },
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "支払い確定に失敗しました。");
        setLoading(false);
        return;
      }
      onSuccess();
    } catch {
      setError("支払い確定に失敗しました。");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-xl bg-[var(--brand-primary)] py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? "処理中..." : `₱${amountPhp} を支払う`}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="w-full rounded-xl bg-[var(--brand-surface)] py-2.5 text-sm text-[var(--brand-text-muted)] disabled:opacity-60"
      >
        キャンセル
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function JoinPageClient() {
  const router = useRouter();
  const { tx } = useI18n();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId ?? "";
  const [dynamicSession, setDynamicSession] = useState<Awaited<ReturnType<typeof getStreamSession>>>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [reservationStatus, setReservationStatus] = useState<ReservationStatus>("loading");
  const [paymentWindowOpen, setPaymentWindowOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<"watch" | "speaker" | null>(null);

  // Payment flow
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountPhp, setAmountPhp] = useState(200);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { isAuthenticated, hydrated, user } = useUserSession();
  const authStatus: AuthStatus = !hydrated ? "loading" : isAuthenticated ? "logged-in" : "guest";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSessionLoading(true);
      const found = await getStreamSession(sessionId);
      if (!cancelled) {
        setDynamicSession(found);
        setSessionLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [sessionId]);

  const checkReservation = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `/api/stream-sessions/${encodeURIComponent(sessionId)}/reservations`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          hasSpeakerReservation?: boolean;
          hasPaidSpeakerReservation?: boolean;
          paymentWindowOpen?: boolean;
        };
        setPaymentWindowOpen(data.paymentWindowOpen ?? false);
        if (data.hasPaidSpeakerReservation) {
          setReservationStatus("paid");
        } else if (data.hasSpeakerReservation) {
          setReservationStatus("reserved");
        } else {
          setReservationStatus("none");
        }
      } else {
        setReservationStatus("none");
      }
    } catch {
      setReservationStatus("error");
    }
  }, [sessionId]);

  useEffect(() => {
    if (authStatus === "logged-in") void checkReservation();
    else if (authStatus === "guest") setReservationStatus("none");
  }, [authStatus, checkReservation]);

  // Reserve (free) and optionally open payment
  const handleReserve = async () => {
    setReservationStatus("reserving");
    setPaymentError(null);

    try {
      const res = await fetch(
        `/api/stream-sessions/${encodeURIComponent(sessionId)}/reservations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "speaker" }),
        },
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        if (!data.error?.includes("already have")) {
          setReservationStatus("none");
          setPaymentError(data.error ?? "予約の作成に失敗しました。");
          return;
        }
      }
      // Re-check status (also updates paymentWindowOpen)
      await checkReservation();
    } catch {
      setReservationStatus("none");
      setPaymentError("予約の作成に失敗しました。");
    }
  };

  // Initialize Stripe PaymentIntent
  const handleStartPayment = async () => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const res = await fetch("/api/billing/speaker-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await res.json()) as {
        clientSecret?: string;
        amountPhp?: number;
        error?: string;
      };
      if (!res.ok || !data.clientSecret) {
        setPaymentError(data.error ?? "決済の準備に失敗しました。");
        setPaymentLoading(false);
        return;
      }
      setClientSecret(data.clientSecret);
      if (data.amountPhp) setAmountPhp(data.amountPhp);
    } catch {
      setPaymentError("決済の準備に失敗しました。");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setClientSecret(null);
    setReservationStatus("paid");
  };

  // Mic setup
  const streamRef = useRef<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
  const [showMicMenu, setShowMicMenu] = useState(false);

  useEffect(() => {
    if (!(authStatus === "logged-in" && reservationStatus === "paid" && selectedPath === "speaker")) {
      setReady(false);
      setMicLevel(0);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      return;
    }

    let mounted = true;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let meterTimer: number | null = null;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true,
          video: false,
        });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audios = devices.filter((d) => d.kind === "audioinput");
        if (mounted) {
          setAudioDevices(audios);
          if (!selectedAudioDeviceId && audios.length > 0) setSelectedAudioDeviceId(audios[0].deviceId);
        }

        meterTimer = window.setInterval(() => {
          if (!analyser) return;
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((s, v) => s + v, 0) / data.length;
          setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        }, 120);

        setReady(true);
        setErrorMessage(null);
      } catch {
        setErrorMessage(tx("マイクの利用が許可されていません。ブラウザ設定を確認してください。", "Microphone access is not allowed. Please check your browser settings."));
        setReady(false);
      }
    };

    void setup();
    return () => {
      mounted = false;
      if (meterTimer) window.clearInterval(meterTimer);
      source?.disconnect();
      analyser?.disconnect();
      audioContext?.close().catch(() => {});
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [authStatus, reservationStatus, selectedAudioDeviceId, selectedPath, tx]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = micOn; });
  }, [micOn]);

  const applyMic = (enabled: boolean) => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = enabled; });
    setMicOn(enabled);
  };

  const joinNow = () => {
    const roomId = encodeURIComponent(session.id);
    const query = new URLSearchParams({
      role: "speaker",
      mic: micOn ? "1" : "0",
      ...(selectedAudioDeviceId ? { micDeviceId: selectedAudioDeviceId } : {}),
    }).toString();
    router.push(`/room/${roomId}?${query}`);
  };

  const session = useMemo<SessionMeta>(() => {
    if (dynamicSession) {
      return {
        id: dynamicSession.sessionId,
        vtuber: dynamicSession.hostName,
        title: dynamicSession.title,
        description: dynamicSession.description,
        duration: dynamicSession.status === "live" ? tx("配信中", "Live now") : tx("約60分", "About 60 min"),
        participationType: participationLabel(dynamicSession.participationType, tx),
        thumbnail: dynamicSession.thumbnail,
      };
    }
    return {
      id: sessionId || "unknown",
      vtuber: tx("読み込み中", "Loading"),
      title: tx("配信枠を読み込んでいます", "Loading session"),
      description: "",
      duration: "",
      participationType: participationLabel("First-come", tx),
      thumbnail: "",
    };
  }, [dynamicSession, sessionId, tx]);

  if (!sessionLoading && !dynamicSession) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
        <p className="text-lg font-semibold">{tx("配信枠が見つかりません", "Session not found")}</p>
        <p className="text-sm text-[var(--brand-text-muted)]">{tx("この枠はすでに終了しているか、存在しません。", "This session has ended or does not exist.")}</p>
        <button onClick={() => router.push("/")} className="rounded-xl bg-[var(--brand-primary)] px-6 py-2.5 text-sm font-bold text-white">
          {tx("ホームに戻る", "Back to Home")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <header className="bg-[var(--brand-bg-900)]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-5 lg:px-12">
          <button onClick={() => router.push("/")} className="flex items-center">
            <Image src="/logo/aiment_logotype.svg" alt="aiment" width={150} height={50} className="h-10 w-auto object-contain brightness-0 invert" />
          </button>
          <p className="text-sm text-[var(--brand-text-muted)]">{tx("視聴・参加の案内", "Viewing & participation")}</p>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[1fr_420px] lg:px-8">
        <section className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-2xl bg-[var(--brand-bg-900)] shadow-xl">
            <div className="relative" style={{ aspectRatio: "16/9" }}>
              {session.thumbnail ? (
                <img src={session.thumbnail} alt={session.vtuber} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-[var(--brand-surface)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-bg-900)]/75 via-[var(--brand-bg-900)]/20 to-transparent" />
              <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold">{tx("配信企画", "Live Event")}</div>
              <div className="absolute bottom-4 left-4 right-4">
                <h1 className="line-clamp-2 text-2xl font-bold leading-tight text-[var(--brand-text)] lg:text-3xl">{session.title}</h1>
                <p className="mt-2 text-sm text-[var(--brand-text-muted)]">{session.vtuber}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--brand-bg-800)] p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-[var(--brand-text-muted)]">{tx("企画の概要", "Overview")}</h2>
            <p className="mb-4 text-sm leading-relaxed text-[var(--brand-text)]">{session.description}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
                <p className="text-xs text-[var(--brand-text-muted)]">{tx("配信時間", "Duration")}</p>
                <p className="text-sm font-semibold text-[var(--brand-text)]">{session.duration}</p>
              </div>
              <div className="rounded-lg bg-[var(--brand-bg-900)] px-3 py-2">
                <p className="text-xs text-[var(--brand-text-muted)]">{tx("参加方式", "Entry Type")}</p>
                <p className="text-sm font-semibold text-[var(--brand-text)]">{session.participationType}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--brand-bg-800)] p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-wide text-[var(--brand-text-muted)]">{tx("選べる参加方法", "Choose how to join")}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-[var(--brand-bg-900)] p-4">
                <p className="text-sm font-semibold text-[var(--brand-text)]">{tx("視聴者", "Viewer")}</p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[var(--brand-text-muted)]">
                  <li>{tx("ログインなしで入れます。", "You can enter without logging in.")}</li>
                  <li>{tx("マイクやカメラの許可は不要です。", "No mic or camera permission is needed.")}</li>
                  <li>{tx("まず雰囲気を見たい人向けです。", "Best if you want to check the vibe first.")}</li>
                </ul>
              </div>
              <div className="rounded-xl bg-[var(--brand-bg-900)] p-4">
                <p className="text-sm font-semibold text-[var(--brand-text)]">{tx("スピーカー", "Speaker")}</p>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[var(--brand-text-muted)]">
                  <li>{tx("ログイン後に申し込みが必要です。", "You need to log in and apply first.")}</li>
                  <li>{tx("参加前に表示名とマイク状態を確認できます。", "You can confirm your display name and mic before joining.")}</li>
                  <li>{tx("会話に参加したい人向けです。", "Best if you want to speak in the session.")}</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl bg-[var(--brand-bg-800)] p-5">
          <div className="rounded-xl bg-[var(--brand-bg-900)] p-4">
            <p className="text-sm font-semibold text-[var(--brand-text)]">{tx("どうしますか？", "What would you like to do?")}</p>
            <p className="mt-2 text-xs text-[var(--brand-text-muted)]">
              {tx("視聴はすぐ始められます。会話参加はログイン後に申し込みへ進みます。", "Watching starts right away. Speaking continues to application after login.")}
            </p>
            <div className="mt-4 grid gap-2">
              <div className="relative">
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-xl bg-[var(--brand-surface)] px-4 py-3 text-sm font-bold text-[var(--brand-text-muted)] opacity-50"
                >
                  {tx("視聴する（準備中）", "Watch now (coming soon)")}
                </button>
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--brand-surface-soft)] px-2 py-0.5 text-[10px] text-[var(--brand-text-muted)]">
                  {tx("一時的に利用不可", "Temporarily unavailable")}
                </span>
              </div>
              <button
                onClick={() => setSelectedPath("speaker")}
                className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                  selectedPath === "speaker"
                    ? "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]"
                    : "bg-[var(--brand-surface)] text-[var(--brand-text)]"
                }`}
              >
                {tx("スピーカー参加を進める", "Continue as speaker")}
              </button>
            </div>
          </div>

          {selectedPath !== "speaker" && (
            <div className="mt-4 rounded-xl bg-[var(--brand-bg-900)] p-4">
              <p className="text-sm font-semibold text-[var(--brand-text)]">{tx("視聴について", "About watching")}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--brand-text-muted)]">
                {tx("配信を見るだけならログイン不要です。あとで話したくなったら、このページに戻ってスピーカー参加へ進めます。", "If you only want to watch, no login is needed. You can come back here later to continue as a speaker.")}
              </p>
            </div>
          )}

          {selectedPath === "speaker" && (authStatus === "loading" || reservationStatus === "loading") && (
            <div className="mt-4 flex h-40 items-center justify-center">
              <p className="text-sm text-[var(--brand-text-muted)]">{tx("確認中...", "Checking...")}</p>
            </div>
          )}

          {selectedPath === "speaker" && authStatus === "guest" && reservationStatus !== "loading" && (
            <div className="mt-4 flex flex-col items-center gap-4 rounded-xl bg-[var(--brand-bg-900)] p-5 text-center">
              <p className="text-sm text-[var(--brand-text)]">
                {tx("スピーカーとして参加するにはアカウントが必要です。", "You need an account to join as a speaker.")}
              </p>
              <button
                onClick={() => router.push(`/auth?redirect=${encodeURIComponent(`/join/${sessionId}`)}`)}
                className="w-full rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white"
              >
                {tx("ログイン / アカウント作成", "Log in / Sign up")}
              </button>
            </div>
          )}

          {/* 未予約 → 予約ボタン */}
          {selectedPath === "speaker" && authStatus === "logged-in" && (reservationStatus === "none" || reservationStatus === "reserving") && (
            <div className="mt-4 flex flex-col gap-4 rounded-xl bg-[var(--brand-bg-900)] p-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-text-muted)]">{tx("プロフィール確認", "Profile check")}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--brand-text)]">{user?.name || tx("表示名未設定", "No display name set")}</p>
                <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{tx("この名前で参加者一覧に表示されます。", "This name will be shown in the participant list.")}</p>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--brand-text)]">{tx("スピーカー枠を申し込む", "Apply for a speaker slot")}</h2>
                <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
                  {dynamicSession
                    ? tx(`残り ${dynamicSession.speakerSlotsLeft} 枠 / ${dynamicSession.speakerSlotsTotal} 枠`, `${dynamicSession.speakerSlotsLeft} / ${dynamicSession.speakerSlotsTotal} slots left`)
                    : tx("スピーカー枠の詳細を確認しています", "Checking speaker slots...")}
                </p>
                <p className="mt-2 rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-xs text-[var(--brand-text-muted)]">
                  {tx("予約は無料です。配信24時間前になったら参加費の支払いが必要です。", "Reservation is free. Payment is required within 24h of the stream.")}
                </p>
              </div>
              {paymentError && <p className="text-xs text-red-400">{paymentError}</p>}
              <button
                onClick={() => void handleReserve()}
                disabled={reservationStatus === "reserving" || (dynamicSession != null && dynamicSession.speakerSlotsLeft === 0)}
                className="w-full rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reservationStatus === "reserving"
                  ? tx("予約中...", "Reserving...")
                  : dynamicSession != null && dynamicSession.speakerSlotsLeft === 0
                    ? tx("満枠です", "No slots left")
                    : tx("スピーカー枠を予約する（無料）", "Reserve a speaker slot (free)")}
              </button>
            </div>
          )}

          {/* 予約完了後 — 24h以内: 支払いオプション / 24h超: 案内 */}
          {selectedPath === "speaker" && authStatus === "logged-in" && reservationStatus === "reserved" && !clientSecret && (
            <div className="mt-4 flex flex-col gap-4 rounded-xl bg-[var(--brand-bg-900)] p-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">{tx("予約完了", "Reserved")}</p>
                <h2 className="mt-2 text-base font-semibold text-[var(--brand-text)]">
                  {paymentWindowOpen
                    ? tx("支払いを完了して参加を確定する", "Pay to confirm your participation")
                    : tx("予約が完了しました", "Your reservation is confirmed")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--brand-text-muted)]">
                  {paymentWindowOpen
                    ? tx(
                        "支払いが可能になりました。配信に参加するには支払いを完了してください。支払いが完了していない場合は入室できません。",
                        "Payment is now open. Please pay to join. You won't be able to enter without completing payment.",
                      )
                    : tx(
                        "配信24時間前になると支払いが可能になります。支払いを済ませてから配信に参加してください。支払いが完了していない場合は入室できません。",
                        "Payment opens 24 hours before the stream. You must pay before joining — unpaid reservations cannot enter.",
                      )}
                </p>
              </div>
              {paymentError && <p className="text-xs text-red-400">{paymentError}</p>}
              {paymentWindowOpen ? (
                <button
                  onClick={() => void handleStartPayment()}
                  disabled={paymentLoading}
                  className="w-full rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {paymentLoading ? tx("準備中...", "Preparing...") : tx("今すぐ支払う →", "Pay now →")}
                </button>
              ) : (
                <div className="rounded-lg bg-[var(--brand-surface)] px-3 py-2.5 text-xs text-[var(--brand-text-muted)]">
                  {dynamicSession?.startsAt
                    ? tx(
                        `支払い開始: ${new Date(new Date(dynamicSession.startsAt).getTime() - 24 * 60 * 60 * 1000).toLocaleString("ja-JP")}`,
                        `Payment opens: ${new Date(new Date(dynamicSession.startsAt).getTime() - 24 * 60 * 60 * 1000).toLocaleString("en-US")}`,
                      )
                    : tx("配信24時間前から支払い可能です", "Payment opens 24h before the stream")}
                </div>
              )}
            </div>
          )}

          {/* 支払い Stripe フォーム（インライン） */}
          {selectedPath === "speaker" && authStatus === "logged-in" && reservationStatus === "reserved" && clientSecret && (
            <div className="mt-4 rounded-xl bg-[var(--brand-bg-900)] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-primary)]">{tx("参加費のお支払い", "Speaker Fee")}</p>
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: { theme: "night" } }}
              >
                <PaymentForm
                  sessionId={sessionId}
                  amountPhp={amountPhp}
                  onSuccess={handlePaymentSuccess}
                  onCancel={() => setClientSecret(null)}
                />
              </Elements>
            </div>
          )}

          {/* 支払い済み → マイクチェック → 入室 */}
          {selectedPath === "speaker" && authStatus === "logged-in" && reservationStatus === "paid" && (
            <div className="mt-4 rounded-xl bg-[var(--brand-bg-900)] p-5">
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--brand-text-muted)]">{tx("参加前の確認", "Before you join")}</p>
                <p className="mt-2 text-sm font-semibold text-[var(--brand-text)]">{user?.name || tx("表示名未設定", "No display name set")}</p>
                <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{tx("必要ならアカウント設定で表示名やアイコンを整えてから参加してください。", "If needed, update your display name and avatar in account settings before joining.")}</p>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wide text-[var(--brand-text-muted)]">{tx("デバイス確認", "Device Check")}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ready ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]"}`}>
                  {ready ? tx("準備OK", "Ready") : tx("準備中", "Preparing")}
                </span>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-[var(--brand-bg-900)]" style={{ aspectRatio: "16/10" }}>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-[var(--brand-text-muted)]">
                  {tx("マイクをチェックしてください", "Check your microphone")}
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-[var(--brand-surface)] p-4">
                <p className="mb-2 text-xs font-medium text-[var(--brand-text-muted)]">{tx("マイク入力レベル", "Mic input level")}</p>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--brand-bg-900)]">
                  <div className="h-full rounded-full bg-[var(--brand-primary)] transition-all" style={{ width: `${micOn ? micLevel : 0}%` }} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="relative inline-flex items-center rounded-full bg-[var(--brand-bg-900)]">
                  <button
                    onClick={() => applyMic(!micOn)}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${micOn ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"}`}
                  >
                    {micOn ? (
                      <MicrophoneIcon className="h-5 w-5" aria-hidden />
                    ) : (
                      <span className="relative flex h-5 w-5 items-center justify-center">
                        <MicrophoneIcon className="h-5 w-5" aria-hidden />
                        <span className="pointer-events-none absolute h-6 w-[5px] -rotate-45 rounded-full bg-black" aria-hidden />
                        <span className="pointer-events-none absolute h-6 w-[2px] -rotate-45 rounded-full bg-current" aria-hidden />
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMicMenu((v) => !v)}
                    className="flex h-12 w-8 items-center justify-center border-l border-black/20 bg-transparent text-[var(--brand-text-muted)]"
                  >
                    <ChevronDownIcon className="h-4 w-4" aria-hidden />
                  </button>
                  {showMicMenu && (
                    <div className="absolute left-0 top-14 z-20 min-w-[220px] rounded-xl bg-[var(--brand-surface)] p-2 shadow-xl shadow-black/35">
                      {audioDevices.map((device, index) => (
                        <button
                          key={device.deviceId}
                          type="button"
                          onClick={() => { setSelectedAudioDeviceId(device.deviceId); setShowMicMenu(false); }}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${selectedAudioDeviceId === device.deviceId ? "bg-[var(--brand-primary)] font-bold text-white" : "text-[var(--brand-text)] hover:bg-[var(--brand-bg-900)]"}`}
                        >
                          {device.label || `Microphone ${index + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {errorMessage && <p className="mt-4 rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">{errorMessage}</p>}

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setSelectedPath(null)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-[var(--brand-text-muted)] transition-colors hover:text-[var(--brand-primary)]"
                >
                  {tx("戻る", "Back")}
                </button>
                <button
                  onClick={joinNow}
                  disabled={!ready || !!errorMessage}
                  className="flex-1 rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:bg-[var(--brand-text-muted)]"
                >
                  {tx("この設定で参加", "Join with this setup")}
                </button>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
