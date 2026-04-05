"use client";

import { TopNav } from "../../components/home/TopNav";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { FieldLabel, SelectField, TextArea, TextInput } from "../../components/ui/Field";

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

export default function DesignGuidelinePage() {
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
                  <p className="mt-1 text-xs text-[var(--brand-text-muted)]">夜城ルミナ</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--brand-text-muted)]">
                    <span>視聴 126</span>
                    <span>参加 3 / 8</span>
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
                  <p className="mt-1 text-xs text-[var(--brand-text-muted)]">白雪ノエルナ</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--brand-text-muted)]">
                    <span>開始 19:30</span>
                    <span>予約 5 / 10</span>
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
                  <p className="mt-1 text-xs text-[var(--brand-text-muted)]">陽葵エルナ</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--brand-text-muted)]">
                    <span>開始 21:00</span>
                    <span>空き 4 / 6</span>
                  </div>
                </div>
              </article>
            </div>

            <div className="mt-4 rounded-[var(--ui-radius-sm)] bg-[var(--brand-bg-900)] p-3 text-xs leading-6 text-[var(--brand-text-muted)]">
              <p>1. サムネイルは常に16:9固定</p>
              <p>2. 状態ラベルは左上に1つだけ（LIVE / STARTING SOON / BOOKABLE）</p>
              <p>3. タイトルを主、配信者名を副、メタ情報を最下段に配置</p>
              <p>4. 配信枠カードは bg 上に直接配置（親に別途 surface パネルを敷かない）</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
