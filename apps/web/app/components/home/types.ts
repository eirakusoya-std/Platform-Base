import type { SubscriptionPlan } from "../../lib/apiTypes";

export type ParticipationType = "First-come" | "Lottery" | "Members-only";
export type SessionId = string;

export type StartingSoonSession = {
  id: SessionId;
  hostUserId?: string;
  hostAvatarUrl?: string;
  hostChannelName?: string;
  vtuber: string;
  title: string;
  thumbnail: string;
  startsInSeconds: number;
  slotsTotal: number;
  slotsLeft: number;
  participationType: ParticipationType;
  requiredPlan?: SubscriptionPlan;
  reservationRequired?: boolean;
  isSubscribed: boolean;
  tags: string[];
  description: string;
  duration: string;
  glowColor: string;
};

export type LiveSession = {
  id: SessionId;
  hostUserId?: string;
  hostAvatarUrl?: string;
  hostChannelName?: string;
  vtuber: string;
  title: string;
  thumbnail: string;
  viewers: number;
  slotsTotal: number;
  slotsLeft: number;
  participationType: "First-come" | "Lottery";
  requiredPlan?: SubscriptionPlan;
  reservationRequired?: boolean;
  isSubscribed: boolean;
  tags: string[];
  description: string;
  duration: string;
  userHistory?: {
    totalParticipations: number;
    lastParticipation: string;
  };
};

export type ModalSession = {
  id: SessionId;
  vtuber: string;
  title: string;
  thumbnail: string;
  startsIn: string;
  slotsLeft: number;
  description: string;
  duration: string;
  participationType: "First-come" | "Lottery";
  isSubscribed: boolean;
  streamStatus?: "prelive" | "live" | "ended";
  requiredPlan?: SubscriptionPlan;
  reservationRequired?: boolean;
  reserved?: boolean;
  userHistory?: {
    totalParticipations: number;
    lastParticipation: string;
  };
};

export type TypeInfo = {
  label: string;
  bg: string;
  icon: string;
};
