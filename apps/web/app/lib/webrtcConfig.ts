let cachedIceServers: RTCIceServer[] | null = null;

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];

export async function loadIceServers(): Promise<RTCIceServer[]> {
  if (cachedIceServers) return cachedIceServers;

  try {
    const response = await fetch("/api/webrtc/config", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load WebRTC config");
    const payload = (await response.json()) as { iceServers?: RTCIceServer[] };
    if (Array.isArray(payload.iceServers) && payload.iceServers.length > 0) {
      cachedIceServers = payload.iceServers;
      return payload.iceServers;
    }
  } catch {
    // fall through to default STUN-only setup
  }

  cachedIceServers = FALLBACK_ICE_SERVERS;
  return FALLBACK_ICE_SERVERS;
}
