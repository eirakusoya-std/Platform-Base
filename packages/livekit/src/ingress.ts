import { IngressClient, IngressInput } from "livekit-server-sdk";

export type IngressParams = {
  apiKey: string;
  apiSecret: string;
  host: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  streamName?: string;
};

export type IngressResult = {
  ingressId: string;
  streamKey: string;
  rtmpUrl: string;
};

function toHttpHost(wsUrl: string): string {
  return wsUrl.replace(/^wss?:\/\//, "https://");
}

export async function createRtmpIngress(params: IngressParams): Promise<IngressResult> {
  const client = new IngressClient(toHttpHost(params.host), params.apiKey, params.apiSecret);

  const ingress = await client.createIngress(IngressInput.RTMP_INPUT, {
    name: params.streamName ?? params.roomName,
    roomName: params.roomName,
    participantIdentity: params.participantIdentity,
    participantName: params.participantName,
  });

  if (!ingress.ingressId || !ingress.streamKey || !ingress.url) {
    throw new Error("LiveKit returned incomplete ingress data");
  }

  return {
    ingressId: ingress.ingressId,
    streamKey: ingress.streamKey,
    rtmpUrl: ingress.url,
  };
}

export async function deleteRtmpIngress(params: {
  apiKey: string;
  apiSecret: string;
  host: string;
  ingressId: string;
}): Promise<void> {
  const client = new IngressClient(toHttpHost(params.host), params.apiKey, params.apiSecret);
  await client.deleteIngress(params.ingressId);
}
