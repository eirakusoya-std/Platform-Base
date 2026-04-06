import Link from "next/link";
import { TopNav } from "../components/home/TopNav";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--brand-bg-900)] text-[var(--brand-text)]">
      <TopNav />
      <main className="mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-12">
        <section className="rounded-3xl border border-white/10 bg-[var(--brand-surface)] p-7">
          <h1 className="text-2xl font-semibold">利用規約</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--brand-text-muted)]">
            本サービスの利用に際して、アカウント情報の適切な管理、他ユーザーへの迷惑行為の禁止、
            権利侵害コンテンツの投稿禁止、法令順守を求めます。運営は必要に応じてアカウント制限や
            コンテンツ削除を行う場合があります。
          </p>
          <div className="mt-6">
            <Link href="/auth/signup" className="text-sm font-semibold text-[var(--brand-secondary)] underline-offset-2 hover:underline">
              サインアップに戻る
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
