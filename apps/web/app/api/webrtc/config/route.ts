import { NextResponse } from "next/server";
import { getIceServers } from "../../../lib/server/webrtcConfig";

export async function GET() {
  return NextResponse.json({ iceServers: getIceServers() });
}
