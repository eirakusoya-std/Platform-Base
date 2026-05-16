import type { Metadata } from "next";
import { getStreamSessionById } from "@/app/lib/server/aimentStore";
import { JoinPageClient } from "./JoinPageClient";

type Props = { params: Promise<{ sessionId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId } = await params;
  const session = await getStreamSessionById(sessionId).catch(() => null);
  if (!session) return { title: "配信が見つかりません" };

  const hostName = session.hostChannelName ?? session.hostName ?? "VTuber";
  const title = session.title;
  const description = session.description
    ? session.description.slice(0, 120)
    : `${hostName}のライブ配信「${title}」に参加しよう。`;
  const ogImage = session.thumbnail
    ? [{ url: session.thumbnail, width: 1200, height: 630, alt: title }]
    : [{ url: "/og-default.png", width: 1200, height: 630, alt: title }];

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title: `${title} | aiment`,
      description,
      images: ogImage,
      url: `https://aiment.jp/join/${sessionId}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | aiment`,
      description,
      images: ogImage.map((i) => i.url),
    },
  };
}

export default async function JoinPage({ params }: Props) {
  const { sessionId } = await params;
  const session = await getStreamSessionById(sessionId).catch(() => null);

  const jsonLd =
    session && session.startsAt
      ? {
          "@context": "https://schema.org",
          "@type": "Event",
          name: session.title,
          description: session.description ?? undefined,
          startDate: session.startsAt,
          eventStatus:
            session.status === "live"
              ? "https://schema.org/EventScheduled"
              : session.status === "ended"
                ? "https://schema.org/EventEnded"
                : "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
          location: {
            "@type": "VirtualLocation",
            url: `https://aiment.jp/join/${sessionId}`,
          },
          organizer: {
            "@type": "Person",
            name: session.hostChannelName ?? session.hostName,
          },
          image: session.thumbnail ?? undefined,
          url: `https://aiment.jp/join/${sessionId}`,
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
      <JoinPageClient />
    </>
  );
}
