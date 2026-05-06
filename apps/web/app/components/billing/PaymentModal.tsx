"use client";

// SOLID: S（決済UIの表示責任をAccountページから分離し、単一コンポーネントに集約）

export type PaymentModalProps = {
  clientSecret: string;
  title: string;
  onSuccess: () => void;
  onClose: () => void;
};

export function PaymentModal({ clientSecret, title, onSuccess, onClose }: PaymentModalProps) {
  const isMockPayment = clientSecret.startsWith("mock_");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--brand-bg-900)] p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold text-[var(--brand-text)]">{title}</h2>
        {isMockPayment ? (
          <>
            <p className="rounded-xl bg-[var(--brand-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--brand-text-muted)]">
              開発用のモック決済です。下のボタンで購入完了として進めます。
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onSuccess}
                className="h-11 flex-1 rounded-lg bg-[var(--brand-secondary)] text-sm font-semibold text-[var(--brand-bg-900)]"
              >
                完了にする
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-lg bg-[var(--brand-surface-soft)] px-4 text-sm text-[var(--brand-text)]"
              >
                キャンセル
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm leading-relaxed text-[var(--brand-accent)]">
              Stripe決済フォームを表示するには、ローカル依存関係の復元が必要です。
              <span className="mt-2 block font-semibold text-[var(--brand-text)]">
                CI=true pnpm install --frozen-lockfile
              </span>
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-lg bg-[var(--brand-surface-soft)] px-4 text-sm text-[var(--brand-text)]"
              >
                閉じる
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
