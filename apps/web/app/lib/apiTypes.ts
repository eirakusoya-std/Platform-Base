export type UserRole = "listener" | "vtuber";
export type AuthProvider = "password" | "google" | "google_demo";
export type SubscriptionPlan = "free" | "supporter" | "premium";
export type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";
export type BillingProvider = "stripe" | "mock";
export type PaymentEventStatus = "received" | "processed" | "failed";
export type ReportCategory = "abuse" | "harassment" | "impersonation" | "billing" | "other";
export type ReportTargetType = "session" | "user" | "message" | "billing";
export type ReportStatus = "open" | "reviewed" | "closed";
export type MonitoringSource = "webrtc" | "billing" | "api" | "system";
export type MonitoringLevel = "info" | "warn" | "error";

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
  plan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionRenewsAt?: string;
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
  /** Listener access plan requirement */
  requiredPlan: SubscriptionPlan;
  reservationRequired: boolean;
  slotsTotal: number;
  slotsLeft: number;
  /** Speaker slot settings */
  speakerSlotsTotal: number;
  speakerSlotsLeft: number;
  speakerRequiredPlan: SubscriptionPlan;
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
  requiredPlan?: SubscriptionPlan;
  reservationRequired?: boolean;
  slotsTotal?: number;
  speakerSlotsTotal?: number;
  speakerRequiredPlan?: SubscriptionPlan;
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
    | "requiredPlan"
    | "reservationRequired"
    | "slotsTotal"
    | "slotsLeft"
    | "speakerSlotsTotal"
    | "speakerRequiredPlan"
    | "preferredVideoDeviceId"
    | "preferredVideoLabel"
  >
>;

export type ReservationType = "speaker" | "listener";

export type Reservation = {
  reservationId: string;
  sessionId: string;
  userId: string;
  userName: string;
  createdAt: string;
  status: ReservationStatus;
  type: ReservationType;
  cancelledAt?: string;
};

export type CreateReservationInput = {
  sessionId: string;
  type: ReservationType;
};

export type BillingSubscription = {
  subscriptionId: string;
  userId: string;
  provider: BillingProvider;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  currentPeriodEnd?: string;
  checkoutUrl?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  checkoutSessionId?: string;
};

export type PaymentEvent = {
  eventId: string;
  provider: BillingProvider;
  providerEventId: string;
  type: string;
  status: PaymentEventStatus;
  createdAt: string;
  summary: string;
  relatedUserId?: string;
  relatedSubscriptionId?: string;
  errorMessage?: string;
};

export type CreateCheckoutInput = {
  plan: Exclude<SubscriptionPlan, "free">;
};

export type ConsentRecord = {
  consentId: string;
  userId: string;
  version: string;
  source: "signup" | "account";
  termsAcceptedAt: string;
  privacyAcceptedAt: string;
};

export type CreateReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  details: string;
};

export type ReportRecord = {
  reportId: string;
  reporterUserId: string;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  details: string;
  status: ReportStatus;
  createdAt: string;
};

export type MonitoringMeta = Record<string, string | number | boolean | null>;

export type MonitoringEvent = {
  eventId: string;
  source: MonitoringSource;
  level: MonitoringLevel;
  code: string;
  message: string;
  createdAt: string;
  meta?: MonitoringMeta;
};

export type CreateMonitoringEventInput = {
  source: MonitoringSource;
  level: MonitoringLevel;
  code: string;
  message: string;
  meta?: MonitoringMeta;
};

export type MonitoringSummary = {
  connectionAttempts: number;
  connectionFailures: number;
  connectionFailureRate: number;
  paymentFailures: number;
  serverErrors: number;
  recentEvents: MonitoringEvent[];
};
