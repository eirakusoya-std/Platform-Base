const DEFAULT_STUN_URLS = ["stun:stun.l.google.com:19302"];

function parseCsvEnv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getIceServers(): RTCIceServer[] {
  const stunUrls = parseCsvEnv(process.env.AIMENT_STUN_URLS);
  const turnUrls = parseCsvEnv(process.env.AIMENT_TURN_URLS);
  const turnUsername = process.env.AIMENT_TURN_USERNAME?.trim();
  const turnCredential = process.env.AIMENT_TURN_CREDENTIAL?.trim();

  const iceServers: RTCIceServer[] = [
    {
      urls: stunUrls.length > 0 ? stunUrls : DEFAULT_STUN_URLS,
    },
  ];

  if (turnUrls.length > 0 && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return iceServers;
}
