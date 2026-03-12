import { NextResponse } from "next/server";
import type { CreateReportInput } from "@/app/lib/apiTypes";
import { requireSessionUser } from "@/app/lib/server/auth";
import { createReport, listReportsForUser, recordMonitoringEvent } from "@/app/lib/server/opsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const reports = await listReportsForUser(user.id);
    return NextResponse.json({ reports });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reports";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json()) as CreateReportInput;
    const report = await createReport(user, body);
    await recordMonitoringEvent({
      source: "system",
      level: "warn",
      code: "report.created",
      message: "A user report was created",
      meta: { userId: user.id, targetType: body.targetType, category: body.category },
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create report";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
