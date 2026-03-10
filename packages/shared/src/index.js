export const EVENTS = {
  JOIN_ROOM: "join-room",
  PEER_JOINED: "peer-joined",
  OFFER: "offer",
  ANSWER: "answer",
  ICE_CANDIDATE: "ice-candidate",
  PEER_LEFT: "peer-left",
};

export const API_ROUTES = {
  AUTH_LOGIN: "/auth/login",
  AUTH_LOGOUT: "/auth/logout",
  AUTH_ME: "/auth/me",
  SESSIONS: "/sessions",
  SESSION_BY_ID: (sessionId) => `/sessions/${encodeURIComponent(sessionId)}`,
  SESSION_START: (sessionId) => `/sessions/${encodeURIComponent(sessionId)}/start`,
  SESSION_END: (sessionId) => `/sessions/${encodeURIComponent(sessionId)}/end`,
  SESSION_RESERVATIONS: (sessionId) => `/sessions/${encodeURIComponent(sessionId)}/reservations`,
  RESERVATION_BY_ID: (reservationId) => `/reservations/${encodeURIComponent(reservationId)}`,
};
