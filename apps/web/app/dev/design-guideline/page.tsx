"use client";

import { ComponentType, SVGProps, useState } from "react";
import { TopNav } from "../../components/home/TopNav";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FieldLabel, SelectField, TextArea, TextInput } from "../../components/ui/Field";
import {
  ClockIcon,
  EyeIcon,
  PencilSquareIcon,
  PlayIcon,
  TrashIcon,
  UserPlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import {
  ChevronDownIcon,
  MicrophoneIcon,
  StopIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

type ColorItem = {
  label: string;
  token: string;
  sampleClass: string;
  textClass?: string;
};

const COLOR_ITEMS: ColorItem[] = [
  { label: "BG", token: "--brand-bg-900", sampleClass: "bg-[var(--brand-bg-900)]" },
  { label: "Surface", token: "--brand-surface", sampleClass: "bg-[var(--brand-surface)]" },
  { label: "Primary", token: "--brand-primary", sampleClass: "bg-[var(--brand-primary)]" },
  { label: "Primary Light", token: "--brand-primary-light", sampleClass: "bg-[var(--brand-primary-light)]", textClass: "text-[var(--brand-bg-900)]" },
  { label: "Primary Dark", token: "--brand-primary-dark", sampleClass: "bg-[var(--brand-primary-dark)]" },
  { label: "Secondary", token: "--brand-secondary", sampleClass: "bg-[var(--brand-secondary)]", textClass: "text-[var(--brand-bg-900)]" },
  { label: "Accent", token: "--brand-accent", sampleClass: "bg-[var(--brand-accent)]" },
  { label: "Text", token: "--brand-text", sampleClass: "bg-[var(--brand-text)]", textClass: "text-[var(--brand-bg-900)]" },
  { label: "Text Muted", token: "--brand-text-muted", sampleClass: "bg-[var(--brand-text-muted)]", textClass: "text-[var(--brand-bg-900)]" },
];

const SPACING_SCALE = ["8px", "12px", "16px", "24px", "32px"];
const RADII = [
  { label: "Small", token: "--ui-radius-sm" },
  { label: "Medium", token: "--ui-radius-md" },
  { label: "Large", token: "--ui-radius-lg" },
  { label: "Pill", token: "--ui-radius-pill" },
];

type CircleControlProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  offIcon?: ComponentType<SVGProps<SVGSVGElement>>;
  slashedWhenOff?: boolean;
  on: boolean;
  onToggle: () => void;
};

function CircleControl({ icon: Icon, offIcon: OffIcon, slashedWhenOff, on, onToggle }: CircleControlProps) {
  const CurrentIcon = on ? Icon : (OffIcon ?? Icon);
  return (
    <button
      onClick={onToggle}
      className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
        on
          ? "bg-[var(--brand-primary)] text-white"
          : "bg-[var(--brand-bg-900)] text-[var(--brand-text-muted)]"
      }`}
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <CurrentIcon className="h-6 w-6" aria-hidden />
        {!on && slashedWhenOff && (
          <>
            <span className="pointer-events-none absolute h-7 w-[5px] -rotate-45 rounded-full bg-black" aria-hidden />
            <span className="pointer-events-none absolute h-7 w-[2px] -rotate-45 rounded-full bg-current" aria-hidden />
          </>
        )}
      </span>
    </button>
  );
}

export default function DesignGuidelinePage() {
  const [guideMicOn, setGuideMicOn] = useState(true);
  const [guideCamOn, setGuideCamOn] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />

      <main className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--brand-text-muted)]">Developer Page</p>
          <h1 className="mt-2 text-3xl font-bold">Design Guideline</h1>
          <p className="mt-2 text-sm text-[var(--brand-text-muted)]">
            UIルールに沿ったカラー・ボタン・フォーム・カードの見た目を一括確認するページです。
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-lg font-bold">Color Tokens</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {COLOR_ITEMS.map((item) => (
                <div key={item.token} className="ui-card-subtle p-3">
                  <div className={`h-14 w-full rounded-[var(--ui-radius-sm)] ${item.sampleClass}`} />
                  <p className={`mt-2 text-sm font-semibold ${item.textClass ?? ""}`}>{item.label}</p>
                  <p className="text-xs text-[var(--brand-text-muted)]">{item.token}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold">Button System</h2>
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="soft">Soft</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="success">Success</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary">
                  Primary / Small
                </Button>
                <Button size="md" variant="primary">
                  Primary / Medium
                </Button>
              </div>

              <div className="rounded-[var(--ui-radius-sm)] bg-[var(--brand-bg-900)] p-3 text-xs leading-6 text-[var(--brand-text-muted)]">
                <p className="mb-1 font-semibold text-[var(--brand-text)]">Heroicons Rules</p>
                <p>1. ボタン先頭に配置、右側には置かない</p>
                <p>2. サイズは `h-4 w-4` を基本、強調ボタンのみ `h-5 w-5`</p>
                <p>3. Stroke系（outline）を基本運用、solidは警告/強調のみ</p>
                <p>4. アイコン色はボタン文字色と同一にする</p>
                <p>5. 文言なしのアイコン単体ボタンは `aria-label` 必須</p>
              </div>

              <div className="ui-card-subtle p-3">
                <p className="mb-2 text-xs font-semibold text-[var(--brand-text-muted)]">Heroicons Visual</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="md">
                    <PlayIcon className="h-4 w-4" aria-hidden />
                    配信開始
                  </Button>
                  <Button variant="soft" size="md">
                    <PencilSquareIcon className="h-4 w-4" aria-hidden />
                    編集
                  </Button>
                  <Button variant="danger" size="md">
                    <TrashIcon className="h-4 w-4" aria-hidden />
                    削除
                  </Button>
                  <Button variant="ghost" size="md">
                    <UserPlusIcon className="h-4 w-4" aria-hidden />
                    参加
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-label="Add participant"
                    className="ui-btn ui-btn-sm ui-btn-ghost h-9 w-9 rounded-[var(--ui-radius-sm)] p-0"
                  >
                    <UserPlusIcon className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Open camera menu"
                    className="ui-btn ui-btn-sm ui-btn-ghost h-9 w-9 rounded-[var(--ui-radius-sm)] p-0"
                  >
                    <VideoCameraIcon className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>

              <div className="ui-card-subtle p-3">
                <p className="mb-2 text-xs font-semibold text-[var(--brand-text-muted)]">Mic / Cam Control Reference</p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-full bg-[var(--brand-bg-900)]">
                    <CircleControl icon={MicrophoneIcon} slashedWhenOff on={guideMicOn} onToggle={() => setGuideMicOn((v) => !v)} />
                    <button type="button" aria-label="Mic device menu" className="flex h-12 w-8 items-center justify-center border-l border-black/20 bg-transparent text-[var(--brand-text-muted)]">
                      <ChevronDownIcon className="h-4 w-4" aria-hidden />
                    </button>
                  </div>

                  <div className="inline-flex items-center rounded-full bg-[var(--brand-bg-900)]">
                    <CircleControl icon={VideoCameraIcon} offIcon={VideoCameraSlashIcon} on={guideCamOn} onToggle={() => setGuideCamOn((v) => !v)} />
                    <button type="button" aria-label="Cam device menu" className="flex h-12 w-8 items-center justify-center border-l border-black/20 bg-transparent text-[var(--brand-text-muted)]">
                      <ChevronDownIcon className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>

              <div className="ui-card-subtle p-3">
                <p className="mb-2 text-xs font-semibold text-[var(--brand-text-muted)]">Live State Action (Accent)</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="ui-btn ui-btn-md inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-accent)] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(255,59,92,0.25)]"
                  >
                    <StopIcon className="h-4 w-4" aria-hidden />
                    配信終了
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-md inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-surface)] px-3 py-2 text-sm font-semibold text-[var(--brand-text-muted)]"
                  >
                    <XMarkIcon className="h-4 w-4" aria-hidden />
                    閉じる
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-[var(--brand-text-muted)]">
                  {`accent は「停止・終了・危険操作」など明確な強調状態でのみ使用。`}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold">Input System</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <FieldLabel>Text Input</FieldLabel>
                <TextInput className="mt-1" placeholder="タイトルを入力" />
              </label>
              <label className="block">
                <FieldLabel>Select</FieldLabel>
                <SelectField className="mt-1" defaultValue="english">
                  <option value="chat">雑談</option>
                  <option value="game">ゲーム</option>
                  <option value="english">英語</option>
                </SelectField>
              </label>
              <label className="block">
                <FieldLabel>Textarea</FieldLabel>
                <TextArea className="mt-1" rows={4} placeholder="配信の概要を入力" />
              </label>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold">Layout Rules</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-semibold">Spacing Scale</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SPACING_SCALE.map((size) => (
                    <span key={size} className="ui-card-subtle rounded-[var(--ui-radius-sm)] px-3 py-1 text-xs text-[var(--brand-text-muted)]">
                      {size}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Radius Tokens</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {RADII.map((radius) => (
                    <div key={radius.token} className="ui-card-subtle p-3">
                      <div
                        className="h-10 w-full bg-[var(--brand-primary)]/25"
                        style={{ borderRadius: `var(${radius.token})` }}
                      />
                      <p className="mt-2 text-xs font-semibold">{radius.label}</p>
                      <p className="text-[11px] text-[var(--brand-text-muted)]">{radius.token}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[var(--ui-radius-sm)] bg-[var(--brand-bg-900)] p-3 text-xs leading-6 text-[var(--brand-text-muted)]">
                <p>1. Primaryは主要CTAのみに使用</p>
                <p>2. Accentは警告・削除など破壊的操作のみ</p>
                <p>3. 余白は 8/12/16/24/32 に固定</p>
                <p>4. 角丸は sm / md / lg の3段階中心</p>
              </div>
            </div>
          </Card>

          <section className="lg:col-span-2">
            <h2 className="text-lg font-bold">Stream Frame Style</h2>
            <p className="mt-1 text-sm text-[var(--brand-text-muted)]">
              枠の見た目ルール（16:9、状態ラベル、情報優先順位）を確認するセクションです。
            </p>
            <p className="mt-1 text-xs text-[var(--brand-text-muted)]">
              配信枠カードは <span className="font-semibold text-[var(--brand-text)]">bg の上に直接配置</span> し、さらに別の灰色パネル上には載せません。
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article className="overflow-hidden rounded-xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
                <div className="relative overflow-hidden rounded-[var(--ui-radius-md)] bg-[var(--brand-surface)]" style={{ aspectRatio: "16/9" }}>
                  <img src="/image/thumbnail/thumbnail_1.png" alt="stream thumbnail sample" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-[var(--ui-radius-sm)] bg-[var(--brand-accent)] px-2 py-1 text-[10px] font-bold text-white">
                    LIVE
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="line-clamp-1 text-sm font-bold">【参加型】英語でフリートーク耐久</p>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full px-1 py-0.5">
                    <span className="h-6 w-6 overflow-hidden rounded-full bg-[var(--brand-bg-900)] ring-1 ring-white/10">
                      <img src="/image/thumbnail/thumbnail_1.png" alt="channel icon sample" className="h-full w-full object-cover" />
                    </span>
                    <span className="text-xs text-[var(--brand-text-muted)]">夜城ルミナ</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--brand-text-muted)]">
                    <span className="inline-flex items-center gap-1"><EyeIcon className="h-3.5 w-3.5" aria-hidden />126</span>
                    <span className="inline-flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5" aria-hidden />3 / 8</span>
                  </div>
                </div>
              </article>

              <article className="overflow-hidden rounded-xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
                <div className="relative overflow-hidden rounded-[var(--ui-radius-md)] bg-[var(--brand-surface)]" style={{ aspectRatio: "16/9" }}>
                  <img src="/image/thumbnail/thumbnail_3.png" alt="stream thumbnail sample" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-[var(--ui-radius-sm)] bg-[var(--brand-primary)] px-2 py-1 text-[10px] font-bold text-white">
                    STARTING SOON
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="line-clamp-1 text-sm font-bold">発音矯正チャレンジ</p>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full px-1 py-0.5">
                    <span className="h-6 w-6 overflow-hidden rounded-full bg-[var(--brand-bg-900)] ring-1 ring-white/10">
                      <img src="/image/thumbnail/thumbnail_3.png" alt="channel icon sample" className="h-full w-full object-cover" />
                    </span>
                    <span className="text-xs text-[var(--brand-text-muted)]">白雪ノエルナ</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--brand-text-muted)]">
                    <span className="inline-flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5" aria-hidden />19:30</span>
                    <span className="inline-flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5" aria-hidden />5 / 10</span>
                  </div>
                </div>
              </article>

              <article className="overflow-hidden rounded-xl bg-[var(--brand-surface)] shadow-lg shadow-black/25">
                <div className="relative overflow-hidden rounded-[var(--ui-radius-md)] bg-[var(--brand-surface)]" style={{ aspectRatio: "16/9" }}>
                  <img src="/image/thumbnail/thumbnail_5.png" alt="stream thumbnail sample" className="h-full w-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-[var(--ui-radius-sm)] bg-[var(--brand-bg-900)]/85 px-2 py-1 text-[10px] font-bold text-[var(--brand-text)]">
                    BOOKABLE
                  </span>
                </div>
                <div className="p-3.5">
                  <p className="line-clamp-1 text-sm font-bold">初心者向け 30分英会話</p>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full px-1 py-0.5">
                    <span className="h-6 w-6 overflow-hidden rounded-full bg-[var(--brand-bg-900)] ring-1 ring-white/10">
                      <img src="/image/thumbnail/thumbnail_5.png" alt="channel icon sample" className="h-full w-full object-cover" />
                    </span>
                    <span className="text-xs text-[var(--brand-text-muted)]">陽葵エルナ</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--brand-text-muted)]">
                    <span className="inline-flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5" aria-hidden />21:00</span>
                    <span className="inline-flex items-center gap-1"><UsersIcon className="h-3.5 w-3.5" aria-hidden />4 / 6</span>
                  </div>
                </div>
              </article>
            </div>

            <div className="mt-4 rounded-[var(--ui-radius-sm)] bg-[var(--brand-bg-900)] p-3 text-xs leading-6 text-[var(--brand-text-muted)]">
              <p>1. サムネイルは常に16:9固定</p>
              <p>2. 状態ラベルは左上に1つだけ（LIVE / STARTING SOON / BOOKABLE）</p>
              <p>3. タイトルを主、配信者名を副、メタ情報を最下段に配置</p>
              <p>4. 配信者名の前にチャンネルアイコン（丸）を必ず表示する</p>
              <p>5. メタ情報は必ずアイコン付きで表示（Clock / Eye / Users）</p>
              <p>6. 配信枠カードは bg 上に直接配置（親に別途 surface パネルを敷かない）</p>
            </div>

            <div className="mt-3 grid gap-2 rounded-[var(--ui-radius-sm)] bg-[var(--brand-bg-900)] p-3 text-xs text-[var(--brand-text-muted)] sm:grid-cols-3">
              <div className="inline-flex items-center gap-1.5">
                <ClockIcon className="h-3.5 w-3.5 text-[var(--brand-primary)]" aria-hidden />
                <span>{`開始時刻 / カウントダウン`}</span>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <EyeIcon className="h-3.5 w-3.5 text-[var(--brand-primary)]" aria-hidden />
                <span>{`視聴者数`}</span>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <UsersIcon className="h-3.5 w-3.5 text-[var(--brand-primary)]" aria-hidden />
                <span>{`参加枠（残り/総数）`}</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
