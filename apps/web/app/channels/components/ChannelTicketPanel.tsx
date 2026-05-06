"use client";

// SOLID: S（チャンネルページでの決済UIをPaymentModalに委譲し、チケット購入の開始処理に専念）
import { useState } from "react";
import { TicketIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import type { TicketType, UserRole } from "../../lib/apiTypes";
import { PaymentModal } from "../../components/billing/PaymentModal";
import { createTicketCheckout, listTicketPurchases } from "../../lib/billing";
import { useI18n } from "../../lib/i18n";
import { useUserSession } from "../../lib/userSession";

type ChannelTicketPanelProps = {
  targetUserId: string;
  channelName: string;
  targetRole: UserRole;
};

const TICKET_OPTIONS: Array<{
  ticketType: TicketType;
  labelJp: string;
  labelEn: string;
  price: string;
}> = [
  {
    ticketType: "1on1_10min",
    labelJp: "10分チケットを購入",
    labelEn: "Buy 10 min ticket",
    price: "PHP 499",
  },
  {
    ticketType: "1on1_30min",
    labelJp: "30分チケットを購入",
    labelEn: "Buy 30 min ticket",
    price: "PHP 1,399",
  },
];

export function ChannelTicketPanel({ targetUserId, channelName, targetRole }: ChannelTicketPanelProps) {
  const router = useRouter();
  const { tx } = useI18n();
  const { hydrated, isAuthenticated, user } = useUserSession();
  const [pendingTicketType, setPendingTicketType] = useState<TicketType | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ clientSecret: string; title: string } | null>(null);

  if (targetRole !== "vtuber") return null;

  const isOwnChannel = user?.id === targetUserId;

  const isAimer = user?.plan === "aimer" && user?.subscriptionStatus === "active";

  const startCheckout = async (ticketType: TicketType) => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }
    if (isOwnChannel) return;
    if (!isAimer) {
      setError(tx(
        "1on1チケットはAimerプラン会員限定です。アカウントページからご加入ください。",
        "1on1 tickets are for Aimer plan members only. Please subscribe from your account page.",
      ));
      return;
    }

    setPendingTicketType(ticketType);
    setMessage(null);
    setError(null);
    try {
      const result = await createTicketCheckout({ ticketType, targetUserId });
      if (result.clientSecret) {
        const option = TICKET_OPTIONS.find((o) => o.ticketType === ticketType);
        setPaymentModal({
          clientSecret: result.clientSecret,
          title: option ? `${tx(option.labelJp, option.labelEn)} — ${option.price}` : tx("チケットを購入", "Buy ticket"),
        });
        return;
      }
      // モックモード
      setMessage(tx("1on1チケットを有効化しました。", "1on1 ticket activated."));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : tx("チケット購入に失敗しました。", "Failed to buy ticket."));
    } finally {
      setPendingTicketType(null);
    }
  };

  const handlePaymentSuccess = async () => {
    setPaymentModal(null);
    setPendingTicketType(null);
    // 購入一覧を再取得してUIに反映する必要があれば親コンポーネントへのcallback追加を検討
    await listTicketPurchases();
    setMessage(tx("1on1チケットを購入しました。", "1on1 ticket purchased."));
  };

  return (
    <>
      <section className="rounded-xl bg-[var(--brand-surface)] p-4 shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-text-muted)]">
              1on1 Ticket
            </p>
            <h2 className="mt-1 text-lg font-bold text-[var(--brand-text)]">
              {tx(`${channelName} さんとの1on1`, `1on1 with ${channelName}`)}
            </h2>
          </div>
          {isOwnChannel ? (
            <p className="text-sm text-[var(--brand-text-muted)]">
              {tx("自分のチャンネル向けチケットは購入できません。", "You cannot buy a ticket for your own channel.")}
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {TICKET_OPTIONS.map((option) => {
            const pending = pendingTicketType === option.ticketType;
            return (
              <button
                key={option.ticketType}
                type="button"
                onClick={() => void startCheckout(option.ticketType)}
                disabled={!hydrated || pendingTicketType != null || isOwnChannel}
                className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <TicketIcon className="h-4 w-4 shrink-0" aria-hidden />
                <span>{pending ? tx("処理中...", "Processing...") : `${tx(option.labelJp, option.labelEn)} — ${option.price}`}</span>
              </button>
            );
          })}
        </div>

        {message ? <p className="mt-3 text-sm text-[var(--brand-secondary)]">{message}</p> : null}
        {error ? (
          <p className="mt-3 text-sm text-[var(--brand-accent)]">
            {error}
            {!isAimer && isAuthenticated ? (
              <a href="/account" className="ml-1 underline">
                {tx("Aimerプランに登録する →", "Subscribe to Aimer →")}
              </a>
            ) : null}
          </p>
        ) : null}
      </section>

      {paymentModal ? (
        <PaymentModal
          clientSecret={paymentModal.clientSecret}
          title={paymentModal.title}
          onSuccess={() => void handlePaymentSuccess()}
          onClose={() => {
            setPaymentModal(null);
            setPendingTicketType(null);
          }}
        />
      ) : null}
    </>
  );
}
