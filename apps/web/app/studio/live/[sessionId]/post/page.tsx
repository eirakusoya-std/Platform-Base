"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { FieldLabel, SelectField, TextArea } from "../../../../components/ui/Field";
import { TopNav } from "../../../../components/home/TopNav";
import { useI18n } from "../../../../lib/i18n";
import { categoryLabel, participationLabel } from "../../../../lib/labels";
import { createUserReport } from "../../../../lib/reports";
import { getStreamSession, type StreamSession } from "../../../../lib/streamSessions";
import { useUserSession } from "../../../../lib/userSession";

type TroubleType = "connection" | "video" | "speaker" | "listener" | "cue" | "reservation" | "other";
type Severity = "low" | "medium" | "high";

const TROUBLE_OPTIONS: Array<{ value: TroubleType; labelJp: string; labelEn: string }> = [
  { value: "connection", labelJp: "接続・音声", labelEn: "Connection / Audio" },
  { value: "video", labelJp: "映像・OBS", labelEn: "Video / OBS" },
  { value: "speaker", labelJp: "スピーカー対応", labelEn: "Speaker Support" },
  { value: "listener", labelJp: "リスナー対応", labelEn: "Listener Support" },
  { value: "cue", labelJp: "cue / phrase assist", labelEn: "Cue / Phrase Assist" },
  { value: "reservation", labelJp: "課金・予約", labelEn: "Billing / Reservation" },
  { value: "other", labelJp: "その他", labelEn: "Other" },
];

const SEVERITY_OPTIONS: Array<{ value: Severity; labelJp: string; labelEn: string }> = [
  { value: "low", labelJp: "低: 記録だけでよい", labelEn: "Low: For record only" },
  { value: "medium", labelJp: "中: 確認してほしい", labelEn: "Medium: Please review" },
  { value: "high", labelJp: "高: 早めに対応してほしい", labelEn: "High: Please respond soon" },
];

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Translate = (jp: string, en: string) => string;

function metricCards(session: StreamSession, tx: Translate) {
  const listenerReservations = Math.max(0, session.slotsTotal - session.slotsLeft);
  const speakerReservations = Math.max(0, session.speakerSlotsTotal - session.speakerSlotsLeft);

  return [
    {
      label: tx("最大同接", "Peak Viewers"),
      value: "-",
      note: tx("未計測", "Not tracked"),
      icon: SignalIcon,
    },
    {
      label: tx("平均同接", "Average Viewers"),
      value: "-",
      note: tx("未計測", "Not tracked"),
      icon: UserGroupIcon,
    },
    {
      label: tx("リスナー予約", "Listener Reservations"),
      value: `${listenerReservations}`,
      note: tx(`${session.slotsTotal}枠中`, `of ${session.slotsTotal} slots`),
      icon: UserGroupIcon,
    },
    {
      label: tx("スピーカー予約", "Speaker Reservations"),
      value: `${speakerReservations}`,
      note: tx(`${session.speakerSlotsTotal}枠中`, `of ${session.speakerSlotsTotal} slots`),
      icon: ChatBubbleLeftRightIcon,
    },
  ];
}

export default function StudioPostLivePage() {
  const router = useRouter();
  const { tx } = useI18n();
  const params = useParams<{ sessionId: string }>();
  const sessionId = decodeURIComponent(params.sessionId ?? "");
  const { hydrated, isVtuber, user } = useUserSession();

  const [session, setSession] = useState<StreamSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [troubleType, setTroubleType] = useState<TroubleType>("connection");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [details, setDetails] = useState("");
  const [replyRequested, setReplyRequested] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!isVtuber) {
      router.replace("/");
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const data = await getStreamSession(sessionId);
      if (!mounted) return;
      if (!data) {
        setLoadError(tx("配信枠が見つかりませんでした。", "Session not found."));
        setLoading(false);
        return;
      }
      if (user && data.hostUserId !== user.id) {
        setLoadError(tx("自分の配信枠のみ確認できます。", "You can only review your own sessions."));
        setLoading(false);
        return;
      }
      setSession(data);
      setLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [hydrated, isVtuber, router, sessionId, tx, user]);

  const metrics = useMemo(() => (session ? metricCards(session, tx) : []), [session, tx]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setFormError(null);
    setSent(false);

    if (!details.trim()) {
      setFormError(tx("困ったことの詳細を入力してください。", "Please describe what happened."));
      return;
    }

    setSubmitting(true);
    try {
      const troubleOption = TROUBLE_OPTIONS.find((option) => option.value === troubleType);
      const severityOption = SEVERITY_OPTIONS.find((option) => option.value === severity);
      const troubleLabel = troubleOption ? tx(troubleOption.labelJp, troubleOption.labelEn) : troubleType;
      const severityLabel = severityOption ? tx(severityOption.labelJp, severityOption.labelEn) : severity;
      await createUserReport({
        targetType: "session",
        targetId: session.sessionId,
        category: "other",
        details: [
          `[Post-stream feedback]`,
          `Session: ${session.title} (${session.sessionId})`,
          `Trouble type: ${troubleLabel}`,
          `Severity: ${severityLabel}`,
          `Reply requested: ${replyRequested ? "yes" : "no"}`,
          "",
          details.trim(),
        ].join("\n"),
      });
      setSent(true);
      setDetails("");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : tx("送信に失敗しました。", "Failed to send."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated || !isVtuber) return null;

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav mode="studio" />
      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/studio/sessions" className="inline-flex items-center gap-2 text-sm text-[var(--brand-text-muted)] hover:text-[var(--brand-text)]">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            {tx("配信枠一覧へ", "Back to Sessions")}
          </Link>
          {session ? (
            <Link href={`/studio/live/${encodeURIComponent(session.sessionId)}`} className="ui-btn ui-btn-sm ui-btn-ghost">
              {tx("Live Studioへ戻る", "Back to Live Studio")}
            </Link>
          ) : null}
        </div>

        {loading ? (
          <Card className="p-8 text-center text-sm text-[var(--brand-text-muted)]">{tx("読み込み中...", "Loading...")}</Card>
        ) : loadError || !session ? (
          <Card className="p-6">
            <div className="flex items-center gap-3 text-[var(--brand-accent)]">
              <ExclamationTriangleIcon className="h-5 w-5" aria-hidden />
              <p className="text-sm font-bold">{loadError ?? tx("配信枠を読み込めませんでした。", "Failed to load session.")}</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <section className="space-y-5">
              <div>
                <p className="text-sm font-bold text-[var(--brand-secondary)]">Post Live</p>
                <h1 className="mt-1 text-2xl font-extrabold">{session.title}</h1>
                <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
                  {session.hostName} / {categoryLabel(session.category, tx)} / {formatDateTime(session.startsAt)}
                </p>
              </div>

              {session.status !== "ended" ? (
                <div className="rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">
                  {tx("この配信はまだ終了状態ではありません。配信終了後の確認ページとして利用してください。", "This session is not marked as ended yet. Use this page after closing the stream.")}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Card key={item.label} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold text-[var(--brand-text-muted)]">{item.label}</p>
                        <Icon className="h-5 w-5 text-[var(--brand-secondary)]" aria-hidden />
                      </div>
                      <p className="mt-3 text-2xl font-extrabold text-[var(--brand-secondary)]">{item.value}</p>
                      <p className="mt-1 text-xs text-[var(--brand-text-muted)]">{item.note}</p>
                    </Card>
                  );
                })}
              </div>

              <Card className="p-5">
                <h2 className="text-lg font-extrabold">{tx("配信データ", "Stream Data")}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[var(--brand-bg-900)] px-4 py-3">
                    <p className="text-xs text-[var(--brand-text-muted)]">{tx("ステータス", "Status")}</p>
                    <p className="mt-1 font-bold text-[var(--brand-text)]">{session.status}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--brand-bg-900)] px-4 py-3">
                    <p className="text-xs text-[var(--brand-text-muted)]">{tx("参加方式", "Entry Type")}</p>
                    <p className="mt-1 font-bold text-[var(--brand-text)]">{participationLabel(session.participationType, tx)}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--brand-bg-900)] px-4 py-3">
                    <p className="text-xs text-[var(--brand-text-muted)]">{tx("必要プラン", "Required Plan")}</p>
                    <p className="mt-1 font-bold text-[var(--brand-text)]">{session.requiredPlan}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--brand-bg-900)] px-4 py-3">
                    <p className="text-xs text-[var(--brand-text-muted)]">{tx("スピーカー必要プラン", "Speaker Required Plan")}</p>
                    <p className="mt-1 font-bold text-[var(--brand-text)]">{session.speakerRequiredPlan}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-[var(--brand-text-muted)]">
                  {tx("最大同接・平均同接・コメント数・cue数は、現時点では配信単位で保存していません。次の実装で session metrics として保存すると、このページに実数を表示できます。", "Peak viewers, average viewers, comment count, and cue count are not stored per session yet. Once session metrics are added, this page can show real values.")}
                </p>
              </Card>
            </section>

            <aside>
              <Card className="p-5">
                <h2 className="text-lg font-extrabold">{tx("運営に送る", "Send to Operations")}</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--brand-text-muted)]">
                  {tx("配信中に困ったことや、確認してほしいことをこの配信に紐づけて送信できます。", "Send issues or follow-up requests tied to this stream.")}
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <label className="grid gap-1.5">
                    <FieldLabel>{tx("種類", "Type")}</FieldLabel>
                    <SelectField value={troubleType} onChange={(event) => setTroubleType(event.target.value as TroubleType)}>
                      {TROUBLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {tx(option.labelJp, option.labelEn)}
                        </option>
                      ))}
                    </SelectField>
                  </label>

                  <label className="grid gap-1.5">
                    <FieldLabel>{tx("重大度", "Severity")}</FieldLabel>
                    <SelectField value={severity} onChange={(event) => setSeverity(event.target.value as Severity)}>
                      {SEVERITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {tx(option.labelJp, option.labelEn)}
                        </option>
                      ))}
                    </SelectField>
                  </label>

                  <label className="grid gap-1.5">
                    <FieldLabel>{tx("詳細", "Details")}</FieldLabel>
                    <TextArea
                      rows={7}
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      placeholder={tx("例: スピーカーの音声が途中で聞こえなくなった / cueが届かなかった / 予約者が入れなかった", "Example: Speaker audio cut out / cues did not arrive / a reserved guest could not enter")}
                    />
                  </label>

                  <label className="flex items-center gap-2 rounded-xl bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text-muted)]">
                    <input
                      type="checkbox"
                      checked={replyRequested}
                      onChange={(event) => setReplyRequested(event.target.checked)}
                    />
                    {tx("運営からの返信を希望する", "Request a reply from operations")}
                  </label>

                  {formError ? <p className="rounded-xl bg-[var(--brand-accent)]/15 px-3 py-2 text-sm text-[var(--brand-accent)]">{formError}</p> : null}
                  {sent ? <p className="rounded-xl bg-green-500/15 px-3 py-2 text-sm text-green-300">{tx("送信しました。ありがとうございます。", "Sent. Thank you.")}</p> : null}

                  <Button type="submit" variant="secondary" fullWidth disabled={submitting}>
                    {submitting ? tx("送信中...", "Sending...") : tx("運営に送信", "Send to Operations")}
                  </Button>
                </form>
              </Card>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
