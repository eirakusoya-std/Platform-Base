import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "./lib/i18n";
import { UserSessionProvider } from "./lib/userSession";

export const metadata: Metadata = {
  title: "aiment",
  description: "beyond chat",
  icons: {
    icon: "/logo/aiment_logo_white.svg",
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
