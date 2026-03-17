import {
  EgressClient,
  StreamOutput,
  StreamProtocol,
} from "livekit-server-sdk";

export type StartEgressParams = {
  apiKey: string;
  apiSecret: string;
  host: string;
  roomName: string;
  rtmpUrl: string;
  vtuberIdentity: string;
};

/**
 * Start egress of the VTuber's video+audio tracks to an RTMP destination
 * (e.g. Cloudflare Stream).
 *
 * Uses `startParticipantEgress` which captures a specific participant's
 * camera + microphone tracks automatically by identity.
 */
export async function startVtuberEgress(
  params: StartEgressParams,
): Promise<string> {
  const egressClient = new EgressClient(
    params.host,
    params.apiKey,
    params.apiSecret,
  );

  const egress = await egressClient.startParticipantEgress(
    params.roomName,
    params.vtuberIdentity,
    {
      stream: new StreamOutput({
        protocol: StreamProtocol.RTMP,
        urls: [params.rtmpUrl],
      }),
    },
  );

  return egress.egressId;
}

export type StopEgressParams = {
  apiKey: string;
  apiSecret: string;
  host: string;
  egressId: string;
};

/**
 * Stop a running egress by its ID.
 */
export async function stopEgress(params: StopEgressParams): Promise<void> {
  const egressClient = new EgressClient(
    params.host,
    params.apiKey,
    params.apiSecret,
  );

  await egressClient.stopEgress(params.egressId);
}
