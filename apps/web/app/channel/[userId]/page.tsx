import { redirect } from "next/navigation";

export default async function LegacyChannelUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  redirect(`/channels/${encodeURIComponent(userId)}`);
}

