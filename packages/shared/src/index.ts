export const EVENTS = {
  JOIN_ROOM: "join-room",
  PEER_JOINED: "peer-joined",
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",
  PEER_LEFT: "peer-left",
} as const;

export type JoinRoomPayload = { roomId: string; peerId: string };

export type OfferPayload = { roomId: string; from: string; sdp: RTCSessionDescriptionInit };
export type AnswerPayload = { roomId: string; from: string; sdp: RTCSessionDescriptionInit };
export type IceCandidatePayload = { roomId: string; from: string; candidate: RTCIceCandidateInit };
