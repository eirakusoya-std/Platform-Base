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
import { createUserReport } from "../../../../lib/reports";
import { getStreamSession, type StreamSession } from "../../../../lib/streamSessions";
import { useUserSession } from "../../../../lib/userSession";

type TroubleType = "connection" | "video" | "speaker" | "listener" | "cue" | "reservation" | "other";
type Severity = "low" | "medium" | "high";

const TROUBLE_OPTIONS: Array<{ value: TroubleType; label: string }> = [
  { value: "connection", label: "接続・音声" },
  { value: "video", label: "映像・OBS" },
  { value: "speaker", label: "スピーカー対応" },
  { value: "listener", label: "リスナー対応" },
  { value: "cue", label: "cue / phrase assist" },
  { value: "reservation", label: "課金・予約" },
  { value: "other", label: "その他" },
];

const SEVERITY_OPTIONS: Array<{ value: Severity; label: string }> = [
  { value: "low", label: "低: 記録だけでよい" },
  { value: "medium", label: "中: 確認してほしい" },
  { value: "high", label: "高: 早めに対応してほしい" },
];

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function metricCards(session: StreamSession) {
  const listenerReservations = Math.max(0, session.slotsTotal - session.slotsLeft);
  const speakerReservations = Math.max(0, session.speakerSlotsTotal - session.speakerSlotsLeft);

  return [
    {
      label: "最大同接",
      value: "-",
      note: "未計測",
      icon: SignalIcon,
    },
    {
      label: "平均同接",
      value: "-",
      note: "未計測",
      icon: UserGroupIcon,
    },
    {
      label: "リスナー予約",
      value: `${listenerReservations}`,
      note: `${session.slotsTotal}枠中`,
      icon: UserGroupIcon,
    },
    {
      label: "スピーカー予約",
      value: `${speakerReservations}`,
      note: `${session.speakerSlotsTotal}枠中`,
      icon: ChatBubbleLeftRightIcon,
    },
  ];
}

export default function StudioPostLivePage() {
  const router = useRouter();
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
        setLoadError("配信枠が見つかりませんでした。");
        setLoading(false);
        return;
      }
      if (user && data.hostUserId !== user.id) {
        setLoadError("自分の配信枠のみ確認できます。");
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
  }, [hydrated, isVtuber, router, sessionId, user]);

  const metrics = useMemo(() => (session ? metricCards(session) : []), [session]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    setFormError(null);
    setSent(false);

    if (!details.trim()) {
      setFormError("困ったことの詳細を入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const troubleLabel = TROUBLE_OPTIONS.find((option) => option.value === troubleType)?.label ?? troubleType;
      const severityLabel = SEVERITY_OPTIONS.find((option) => option.value === severity)?.label ?? severity;
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
      setFormError(caught instanceof Error ? caught.message : "送信に失敗しました。");
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
            配信枠一覧へ
          </Link>
          {session ? (
            <Link href={`/studio/live/${encodeURIComponent(session.sessionId)}`} className="ui-btn ui-btn-sm ui-btn-ghost">
              Live Studioへ戻る
            </Link>
          ) : null}
        </div>

        {loading ? (
          <Card className="p-8 text-center text-sm text-[var(--brand-text-muted)]">読み込み中...</Card>
        ) : loadError || !session ? (
          <Card className="p-6">
            <div className="flex items-center gap-3 text-[var(--brand-accent)]">
              <ExclamationTriangleIcon className="h-5 w-5" aria-hidden />
              <p className="text-sm font-bold">{loadError ?? "配信枠を読み込めませんでした。"}</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <section className="space-y-5">
              <div>
                <p className="text-sm font-bold text-[var(--brand-secondary)]">Post Live</p>
                <h1 className="mt-1 text-2xl font-extrabold">{session.title}</h1>
                <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
                  {session.hostName} / {session.category} / {formatDateTime(session.startsAt)}
                </p>
              </div>

              {session.status !== "ended" ? (
                <div className="rounded-xl bg-[var(--brand-accent)]/15 px-4 py-3 text-sm text-[var(--brand-accent)]">
                  この配信はまだ終了状態ではありません。配信終了後の確認ページとして利用してください。
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
                <h2 className="text-lg font-extrabold">配信データ</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-[var(--brand-bg-900)] px-4 py-3">
                    <p className="text-xs text-[var(--brand-text-muted)]">ステータス</p>
                    <p className="mt-1 font-bold text-[var(--brand-text)]">{session.status}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--brand-bg-900)] px-4 py-3">
                    <p className="text-xs text-[var(--brand-text-muted)]">参加方式</p>
                    <p className="mt-1 font-bold text-[var(--brand-text)]">{session.participationType}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--brand-bg-900)] px-4 py-3">
                    <p className="text-xs text-[var(--brand-text-muted)]">必要プラン</p>
                    <p className="mt-1 font-bold text-[var(--brand-text)]">{session.requiredPlan}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--brand-bg-900)] px-4 py-3">
                    <p className="text-xs text-[var(--brand-text-muted)]">スピーカー必要プラン</p>
                    <p className="mt-1 font-bold text-[var(--brand-text)]">{session.speakerRequiredPlan}</p>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-[var(--brand-text-muted)]">
                  最大同接・平均同接・コメント数・cue数は、現時点では配信単位で保存していません。次の実装で session metrics として保存すると、このページに実数を表示できます。
                </p>
              </Card>
            </section>

            <aside>
              <Card className="p-5">
                <h2 className="text-lg font-extrabold">運営に送る</h2>
                <p className="mt-1 text-sm leading-relaxed text-[var(--brand-text-muted)]">
                  配信中に困ったことや、確認してほしいことをこの配信に紐づけて送信できます。
                </p>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <label className="grid gap-1.5">
                    <FieldLabel>種類</FieldLabel>
                    <SelectField value={troubleType} onChange={(event) => setTroubleType(event.target.value as TroubleType)}>
                      {TROUBLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </label>

                  <label className="grid gap-1.5">
                    <FieldLabel>重大度</FieldLabel>
                    <SelectField value={severity} onChange={(event) => setSeverity(event.target.value as Severity)}>
                      {SEVERITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </label>

                  <label className="grid gap-1.5">
                    <FieldLabel>詳細</FieldLabel>
                    <TextArea
                      rows={7}
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      placeholder="例: スピーカーの音声が途中で聞こえなくなった / cueが届かなかった / 予約者が入れなかった"
                    />
                  </label>

                  <label className="flex items-center gap-2 rounded-xl bg-[var(--brand-bg-900)] px-3 py-2 text-sm text-[var(--brand-text-muted)]">
                    <input
                      type="checkbox"
                      checked={replyRequested}
                      onChange={(event) => setReplyRequested(event.target.checked)}
                    />
                    運営からの返信を希望する
                  </label>

                  {formError ? <p className="rounded-xl bg-[var(--brand-accent)]/15 px-3 py-2 text-sm text-[var(--brand-accent)]">{formError}</p> : null}
                  {sent ? <p className="rounded-xl bg-green-500/15 px-3 py-2 text-sm text-green-300">送信しました。ありがとうございます。</p> : null}

                  <Button type="submit" variant="secondary" fullWidth disabled={submitting}>
                    {submitting ? "送信中..." : "運営に送信"}
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
