import type { Metadata } from "next";
import { getUserById } from "@/app/lib/server/aimentStore";
import { ChannelPageClient } from "./ChannelPageClient";

type Props = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;
  const user = await getUserById(userId).catch(() => null);
  if (!user) return { title: "チャンネルが見つかりません" };

  const channelName = user.channelName ?? user.name;
  const description = user.bio
    ? user.bio.slice(0, 120)
    : `${channelName}のaimentチャンネル。ライブ配信・1on1トークをお楽しみください。`;
  const ogImage = user.avatarUrl
    ? [{ url: user.avatarUrl, width: 400, height: 400, alt: channelName }]
    : [{ url: "/og-default.png", width: 1200, height: 630, alt: channelName }];

  return {
    title: channelName,
    description,
    openGraph: {
      type: "profile",
      title: `${channelName} | aiment`,
      description,
      images: ogImage,
      url: `https://aiment.jp/channels/${userId}`,
    },
    twitter: {
      card: user.avatarUrl ? "summary" : "summary_large_image",
      title: `${channelName} | aiment`,
      description,
      images: ogImage.map((i) => i.url),
    },
  };
}

export default async function ChannelPage({ params }: Props) {
  const { userId } = await params;
  const user = await getUserById(userId).catch(() => null);

  const jsonLd = user
    ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: user.channelName ?? user.name,
        description: user.bio ?? undefined,
        url: `https://aiment.jp/channels/${userId}`,
        mainEntity: {
          "@type": "Person",
          name: user.channelName ?? user.name,
          image: user.avatarUrl ?? undefined,
          url: `https://aiment.jp/channels/${userId}`,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ChannelPageClient />
    </>
  );
}
