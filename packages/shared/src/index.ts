export const EVENTS = {
  JOIN_ROOM: "join-room",
  JOINED_ROOM: "joined-room",
  PEER_JOINED: "peer-joined",
  REQUEST_RENEGOTIATION: "request-renegotiation",
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",
  PEER_LEFT: "peer-left",
  ROOM_FULL: "room-full",
} as const;

export const API_ROUTES = {
  AUTH_LOGIN: "/auth/login",
  AUTH_LOGOUT: "/auth/logout",
  AUTH_ME: "/auth/me",
  SESSIONS: "/sessions",
  SESSION_BY_ID: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}`,
  SESSION_START: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/start`,
  SESSION_END: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/end`,
  SESSION_RESERVATIONS: (sessionId: string) => `/sessions/${encodeURIComponent(sessionId)}/reservations`,
  RESERVATION_BY_ID: (reservationId: string) => `/reservations/${encodeURIComponent(reservationId)}`,
} as const;

export type Role = "host" | "speaker" | "listener";
export type StreamSessionStatus = "prelive" | "live" | "ended";
export type ParticipationType = "First-come" | "Lottery";

export type ApiError = {
  code: string;
  message: string;
};

export type AuthUser = {
  userId: string;
  name: string;
  role: "user" | "vtuber" | "admin";
};

export type AuthLoginRequest = {
  userId: string;
  name: string;
  role?: AuthUser["role"];
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type StreamSession = {
  sessionId: string;
  hostUserId: string;
  hostName: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  status: StreamSessionStatus;
  createdAt: string;
  startsAt: string;
  participationType: ParticipationType;
  slotsTotal: number;
  slotsLeft: number;
  preferredVideoDeviceId?: string;
  preferredVideoLabel?: string;
};

export type CreateSessionRequest = {
  hostUserId: string;
  hostName?: string;
  title: string;
  description: string;
  category: string;
  thumbnail?: string;
  startsAt?: string;
  participationType?: ParticipationType;
  slotsTotal?: number;
  preferredVideoDeviceId?: string;
  preferredVideoLabel?: string;
};

export type UpdateSessionRequest = Partial<Omit<StreamSession, "sessionId" | "hostUserId" | "createdAt">>;

export type Reservation = {
  reservationId: string;
  sessionId: string;
  userId: string;
  name?: string;
  createdAt: string;
};

export type CreateReservationRequest = {
  userId: string;
  name?: string;
};

export type JoinRoomPayload = { roomId: string; peerId: string; requestedRole?: Role };
export type JoinedRoomPayload = {
  roomId: string;
  peerId: string;
  role: Role;
  reconnected: boolean;
  peers: Array<{ peerId: string; role: Role }>;
};

export type OfferPayload = { roomId: string; from: string; sdp: RTCSessionDescriptionInit };
export type AnswerPayload = { roomId: string; from: string; sdp: RTCSessionDescriptionInit };
export type IceCandidatePayload = { roomId: string; from: string; candidate: RTCIceCandidateInit };
export type RequestRenegotiationPayload = { roomId: string; from: string };
