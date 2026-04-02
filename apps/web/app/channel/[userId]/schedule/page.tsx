import { redirect } from "next/navigation";

export default async function LegacyChannelUserSchedulePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  redirect(`/channels/${encodeURIComponent(userId)}/schedule`);
}

