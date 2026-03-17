import { RoomServiceClient } from "livekit-server-sdk";

export type RoomParams = {
  apiKey: string;
  apiSecret: string;
  host: string;
  roomName: string;
  maxParticipants?: number;
  emptyTimeoutSeconds?: number;
};

/**
 * Create or ensure a LiveKit room exists.
 * Default: 6 participants (VTuber + 5 speakers), 5 min empty timeout.
 */
export async function ensureRoomExists(params: RoomParams): Promise<void> {
  const client = new RoomServiceClient(
    params.host,
    params.apiKey,
    params.apiSecret,
  );

  await client.createRoom({
    name: params.roomName,
    maxParticipants: params.maxParticipants ?? 6,
    emptyTimeout: params.emptyTimeoutSeconds ?? 300,
  });
}
