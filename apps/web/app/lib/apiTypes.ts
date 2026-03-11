export type UserRole = "listener" | "vtuber";
export type AuthProvider = "password" | "google_demo";

export type SessionUser = {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  authProvider: AuthProvider;
  createdAt: string;
  lastLoginAt?: string;
  channelName?: string;
  bio?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  termsAcceptedAt?: string;
  privacyAcceptedAt?: string;
};

export type AuthSession = {
  user: SessionUser | null;
  isAuthenticated: boolean;
};

export type SignupInput = {
  role: UserRole;
  name: string;
  email: string;
  password?: string;
  provider: AuthProvider;
  channelName?: string;
  phoneNumber?: string;
  bio?: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

export type LoginInput = {
  email: string;
  password?: string;
  provider: AuthProvider;
};

export type StreamSessionStatus = "prelive" | "live" | "ended";

export type ParticipationType = "First-come" | "Lottery";
export type ReservationStatus = "reserved" | "cancelled";

export type StreamSession = {
  sessionId: string;
  hostUserId: string;
  title: string;
  status: StreamSessionStatus;
  createdAt: string;
  startsAt: string;
  description: string;
  category: string;
  thumbnail: string;
  hostName: string;
  participationType: ParticipationType;
  reservationRequired: boolean;
  slotsTotal: number;
  slotsLeft: number;
  preferredVideoDeviceId?: string;
  preferredVideoLabel?: string;
};

export type CreateStreamSessionInput = {
  title: string;
  description: string;
  category: string;
  thumbnail?: string;
  hostName?: string;
  startsAt?: string;
  participationType?: ParticipationType;
  reservationRequired?: boolean;
  slotsTotal?: number;
  preferredVideoDeviceId?: string;
  preferredVideoLabel?: string;
};

export type UpdateStreamSessionInput = Partial<
  Pick<
    StreamSession,
    | "title"
    | "startsAt"
    | "description"
    | "category"
    | "thumbnail"
    | "hostName"
    | "participationType"
    | "reservationRequired"
    | "slotsTotal"
    | "slotsLeft"
    | "preferredVideoDeviceId"
    | "preferredVideoLabel"
  >
>;

export type Reservation = {
  reservationId: string;
  sessionId: string;
  userId: string;
  userName: string;
  createdAt: string;
  status: ReservationStatus;
  cancelledAt?: string;
};

export type CreateReservationInput = {
  sessionId: string;
};
