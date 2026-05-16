import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "./lib/i18n";
import { UserSessionProvider } from "./lib/userSession";

const SITE_URL = "https://aiment.jp";
const DEFAULT_DESCRIPTION =
  "VTuberとリスナーが一対一でつながれるライブ配信プラットフォーム。好きなVTuberと話せる、新しいファン体験。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "aiment",
    template: "%s | aiment",
  },
  description: DEFAULT_DESCRIPTION,
  icons: {
    icon: "/logo/aiment_logo_rounded.svg",
  },
  openGraph: {
    type: "website",
    siteName: "aiment",
    locale: "ja_JP",
    url: SITE_URL,
    title: "aiment",
    description: DEFAULT_DESCRIPTION,
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "aiment" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "aiment",
    description: DEFAULT_DESCRIPTION,
    images: ["/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <UserSessionProvider>
          <I18nProvider>{children}</I18nProvider>
        </UserSessionProvider>
      </body>
    </html>
  );
}
