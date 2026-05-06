"use client";

// SOLID: S（電話番号認証のUI・ステップ管理に専念。API呼び出しを外部に委譲しない）
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

const COUNTRY_CODES = [
  { code: "+81", label: "🇯🇵 日本 (+81)" },
  { code: "+63", label: "🇵🇭 フィリピン (+63)" },
  { code: "+1", label: "🇺🇸 米国/カナダ (+1)" },
  { code: "+82", label: "🇰🇷 韓国 (+82)" },
  { code: "+86", label: "🇨🇳 中国 (+86)" },
  { code: "+44", label: "🇬🇧 英国 (+44)" },
];

const CODE_LENGTH = 6;

type Step = "input" | "code";
type Method = "sms" | "voice";

type Props = {
  onSuccess: () => void;
  onClose: () => void;
  isDev?: boolean;
};

export function PhoneVerifyModal({ onSuccess, onClose, isDev }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [countryCode, setCountryCode] = useState("+81");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [method, setMethod] = useState<Method>("sms");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === "code") inputRefs.current[0]?.focus();
  }, [step]);

  const fullPhone = `${countryCode}${phoneLocal.replace(/^0/, "")}`;

  const handleRequestCode = async () => {
    if (!phoneLocal.trim()) {
      setError("電話番号を入力してください。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // まず電話番号をプロフィールに保存してからコードを送信
      const saveRes = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fullPhone }),
      });
      if (!saveRes.ok) {
        const d = (await saveRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? "電話番号の保存に失敗しました。");
      }
      const res = await fetch("/api/account/verify/phone/request", { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { devCode?: string; error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "コード送信に失敗しました。");
      if (isDev && payload?.devCode) setDevCode(payload.devCode);
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (pasted.length === CODE_LENGTH) {
      setDigits(pasted.split(""));
      inputRefs.current[CODE_LENGTH - 1]?.focus();
    }
  };

  const handleConfirm = async () => {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError("6桁のコードを入力してください。");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/verify/phone/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "認証に失敗しました。");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました。");
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--brand-bg-900)] p-6 shadow-xl">
        {step === "input" ? (
          <>
            <h2 className="mb-1 text-lg font-bold text-[var(--brand-text)]">電話番号の設定</h2>
            <p className="mb-5 text-xs text-[var(--brand-text-muted)]">
              使用する電話番号を選択してください。
            </p>

            {/* 国コード + 電話番号 */}
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="rounded-lg bg-[var(--brand-surface)] px-2 py-2.5 text-sm text-[var(--brand-text)] outline-none"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                type="tel"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value)}
                placeholder="090-0000-0000"
                className="flex-1 rounded-lg bg-[var(--brand-surface)] px-4 py-2.5 text-sm text-[var(--brand-text)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>

            {/* SMS / 音声 */}
            <p className="mb-2 mt-5 text-xs font-semibold text-[var(--brand-text-muted)]">コードの取得方法</p>
            <div className="flex gap-4">
              {(["sms", "voice"] as const).map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--brand-text)]">
                  <input
                    type="radio"
                    name="method"
                    checked={method === m}
                    onChange={() => setMethod(m)}
                    className="accent-[var(--brand-primary)]"
                  />
                  {m === "sms" ? "テキストメッセージ" : "音声通話"}
                </label>
              ))}
            </div>

            {error ? <p className="mt-3 text-sm text-[var(--brand-accent)]">{error}</p> : null}

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm text-[var(--brand-text-muted)]"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void handleRequestCode()}
                disabled={loading}
                className="rounded-lg bg-[var(--brand-primary)] px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "送信中..." : "次へ"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-1 text-lg font-bold text-[var(--brand-text)]">コードを入力</h2>
            <p className="mb-5 text-xs text-[var(--brand-text-muted)]">
              {fullPhone} に送信した6桁のコードを入力してください。
            </p>

            {isDev && devCode ? (
              <p className="mb-3 rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-xs text-[var(--brand-secondary)]">
                開発用コード: <strong>{devCode}</strong>
              </p>
            ) : null}

            {/* 6桁 OTP ボックス */}
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  className="h-12 w-10 rounded-xl bg-[var(--brand-surface)] text-center text-lg font-bold text-[var(--brand-text)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              ))}
            </div>

            {error ? <p className="mt-3 text-center text-sm text-[var(--brand-accent)]">{error}</p> : null}

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => { setStep("input"); setDigits(Array(CODE_LENGTH).fill("")); setError(null); }}
                className="rounded-lg px-4 py-2 text-sm text-[var(--brand-text-muted)]"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={loading || digits.join("").length < CODE_LENGTH}
                className="rounded-lg bg-[var(--brand-primary)] px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {loading ? "確認中..." : "認証する"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
