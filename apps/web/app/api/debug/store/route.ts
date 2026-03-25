import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  const useNeon = Boolean(databaseUrl);

  if (!useNeon) {
    return NextResponse.json({
      backend: "file",
      useNeon: false,
      message: "DATABASE_URL is not set — using ephemeral file store",
    });
  }

  try {
    const sql = neon(databaseUrl!);

    // Check tables exist and count rows
    const tableCheck = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'stream_sessions', 'reservations')
      ORDER BY table_name
    `;
    const existingTables = tableCheck.map((r) => r.table_name as string);

    let userCount = 0;
    let sessionCount = 0;
    let reservationCount = 0;

    if (existingTables.includes("users")) {
      const r = await sql`SELECT COUNT(*) as cnt FROM users`;
      userCount = Number(r[0].cnt);
    }
    if (existingTables.includes("stream_sessions")) {
      const r = await sql`SELECT COUNT(*) as cnt FROM stream_sessions`;
      sessionCount = Number(r[0].cnt);
    }
    if (existingTables.includes("reservations")) {
      const r = await sql`SELECT COUNT(*) as cnt FROM reservations`;
      reservationCount = Number(r[0].cnt);
    }

    return NextResponse.json({
      backend: "neon",
      useNeon: true,
      connected: true,
      tables: existingTables,
      counts: { users: userCount, sessions: sessionCount, reservations: reservationCount },
    });
  } catch (err) {
    return NextResponse.json({
      backend: "neon",
      useNeon: true,
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
