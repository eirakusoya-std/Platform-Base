"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "../lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { tx } = useI18n();

  useEffect(() => {
    router.replace("/auth");
  }, [router]);

  return (
    <main className="min-h-screen bg-[var(--brand-bg-900)] px-5 py-8 text-[var(--brand-text)] md:px-10 md:py-12">
      <p className="text-sm text-[var(--brand-text-muted)]">{tx("ログインページへ移動中...", "Redirecting to login...")}</p>
    </main>
  );
}
