"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccountSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/account");
  }, [router]);

  return (
    <main className="min-h-screen bg-[var(--brand-bg-900)] px-6 py-16 text-[var(--brand-text)]">
      <div className="mx-auto max-w-xl rounded-2xl bg-[var(--brand-surface)] p-6 text-center shadow-lg shadow-black/25">
        <h1 className="text-2xl font-bold">アカウント管理へ移動します</h1>
        <p className="mt-2 text-sm text-[var(--brand-text-muted)]">設定導線は `/account` に統一されています。</p>
        <Link href="/account" className="mt-4 inline-flex rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white">
          アカウント管理を開く
        </Link>
      </div>
    </main>
  );
}
