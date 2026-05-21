import { NextResponse } from "next/server";
import { listSessionsStartingBetween } from "@/app/lib/server/aimentStore";
import { sendStreamReminder } from "@/app/lib/server/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET?.trim();

/** POST /api/cron/stream-reminders
 *  Called by Vercel Cron every 10 minutes.
 *  Sends reminder emails to speaker reservations for sessions starting in 3–3.5 hours.
 */
export async function POST(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  // Window: sessions starting between 3h and 3h30m from now
  const windowStart = new Date(now + 3 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 3.5 * 60 * 60 * 1000);

  try {
    const sessions = await listSessionsStartingBetween(windowStart, windowEnd);

    let sent = 0;
    const errors: string[] = [];

    for (const { session, reservations } of sessions) {
      for (const r of reservations) {
        if (!r.email) continue;
        try {
          await sendStreamReminder({
            to: r.email,
            userName: r.userName,
            sessionTitle: session.title,
            sessionId: session.sessionId,
            startsAt: new Date(session.startsAt),
            isPaid: r.isPaid,
          });
          sent++;
        } catch (err) {
          errors.push(`${r.email}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    return NextResponse.json({ ok: true, sent, errors: errors.length > 0 ? errors : undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
